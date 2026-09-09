import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { Buffer } from "buffer";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { Linking, Alert } from 'react-native';
import * as LinkingExpo from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

import { AnchorWallet } from '../utils/anchorClient';
import { useNetworkStore } from '../../stores/useNetworkStore';
import { useUserStore } from '../../stores/useUserStore';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

export type WalletType = 'phantom' | 'solflare' | 'backpack' | 'mwa';

export interface WalletContextState {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  walletType: WalletType | null;
  walletName: string | null;
  anchorWallet: AnchorWallet | null;
  cluster: 'devnet' | 'mainnet-beta';
  connect: (type?: WalletType) => Promise<PublicKey | null>;
  cancelConnecting: () => void;
  disconnect: (revokePhantomSession?: boolean) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

const WalletContext = createContext<WalletContextState | null>(null);

export interface WalletProviderProps {
  children: ReactNode;
  defaultCluster?: 'devnet' | 'mainnet-beta';
}

const PHANTOM_STORAGE_KEYS = {
  PUBKEY: '@ned_phantom_pubkey',
  SESSION: '@ned_phantom_session',
  SHARED_SECRET: '@ned_phantom_shared_secret',
  DAPP_SECRET_KEY: '@ned_phantom_dapp_secret_key',
};

/**
 * Phase 2 & 3: Handshake, Kết nối Phantom & Ký thông điệp SIWS / Giao dịch On-chain
 */
export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  defaultCluster,
}) => {
  const { activeNetwork } = useNetworkStore();
  const currentCluster = activeNetwork || defaultCluster || 'mainnet-beta';

  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);

  // Refs lưu trữ bất biến các thông số mật mã học qua các render cycle
  const publicKeyRef = useRef<PublicKey | null>(null);
  const sharedSecretRef = useRef<Uint8Array | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const dappKeyPairRef = useRef<nacl.BoxKeyPair | null>(null);

  // Ref lưu trữ Promise resolution cho Handshake kết nối
  const pendingConnectRef = useRef<{
    resolve: (pubkey: PublicKey) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Ref lưu trữ Promise resolution cho SignMessage
  const pendingSignMessageRef = useRef<{
    resolve: (signature: string) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Ref lưu trữ Promise resolution cho SignTransaction
  const pendingSignTransactionRef = useRef<{
    resolve: (tx: any) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Ref lưu trữ URL cuối cùng đã xử lý để tránh duplicate event giữa Linking.addEventListener và getInitialURL
  const lastHandledUrlRef = useRef<string | null>(null);

  // Khôi phục phiên kết nối Phantom đã lưu từ AsyncStorage khi khởi động app
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedPubkey, storedSession, storedSecret, storedDappKey] = await Promise.all([
          AsyncStorage.getItem(PHANTOM_STORAGE_KEYS.PUBKEY),
          AsyncStorage.getItem(PHANTOM_STORAGE_KEYS.SESSION),
          AsyncStorage.getItem(PHANTOM_STORAGE_KEYS.SHARED_SECRET),
          AsyncStorage.getItem(PHANTOM_STORAGE_KEYS.DAPP_SECRET_KEY),
        ]);

        if (storedPubkey && storedSession && storedSecret && storedDappKey) {
          const userPub = new PublicKey(storedPubkey);
          publicKeyRef.current = userPub;
          sessionTokenRef.current = storedSession;
          sharedSecretRef.current = bs58.decode(storedSecret);

          const dappSecret = bs58.decode(storedDappKey);
          const dappKeyPair = nacl.box.keyPair.fromSecretKey(dappSecret);
          dappKeyPairRef.current = dappKeyPair;

          setPublicKey(userPub);
          setWalletType('phantom');
          console.log('🔄 [WalletProvider] Đã khôi phục phiên ví Phantom:', userPub.toBase58());
        }
      } catch (err) {
        console.warn('⚠️ [WalletProvider] Không thể khôi phục phiên ví Phantom:', err);
      }
    };

    restoreSession();
  }, []);

  // Lắng nghe callback Deep Link từ Phantom (onConnect & onSignMessage)
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        if (!event.url) return;

        console.log('📥 [WalletProvider] Nhận callback URL:', event.url);

        const parsed = LinkingExpo.parse(event.url);
        const queryParams = parsed.queryParams || {};
        const params = new URLSearchParams(
          event.url.includes('?') ? event.url.split('?')[1] : ''
        );

        // Helper trích xuất param an toàn từ cả URLSearchParams và Expo Linking parsed.queryParams
        const getParam = (name: string): string | null => {
          const fromSearch = params.get(name);
          if (fromSearch) return fromSearch;
          if (queryParams[name] !== undefined) {
            const val = queryParams[name];
            return Array.isArray(val) ? (val[0] ?? null) : String(val);
          }
          return null;
        };

        // Kiểm tra xem URL có chứa dữ liệu mã hóa hoặc mã lỗi từ ví hay không.
        // Nếu không có bất kỳ param nào, đây chỉ là bare navigation route từ Expo Router (vd: /onSignMessage, /onConnect),
        // tuyệt đối KHÔNG được ném lỗi để tránh hủy pending promise khi người dùng đang thao tác trên ví!
        const hasParams = !!(
          getParam('data') ||
          getParam('nonce') ||
          getParam('errorCode') ||
          getParam('phantom_encryption_public_key')
        );

        if (!hasParams) {
          console.log('⏩ [WalletProvider] Bỏ qua bare route URL không chứa query params từ ví:', event.url);
          return;
        }

        // Bỏ qua nếu cùng một URL callback có params đã được xử lý trước đó (tránh duplicate giữa Linking listener và getInitialURL)
        if (lastHandledUrlRef.current === event.url) {
          console.log('⏩ [WalletProvider] URL đã xử lý, bỏ qua duplicate event.');
          return;
        }
        lastHandledUrlRef.current = event.url;

        // Kiểm tra xem Phantom có gửi callback lỗi/từ chối hay không
        const errorCode = getParam('errorCode');
        const errorMessage = getParam('errorMessage');
        if (errorCode) {
          const decodedMsg = errorMessage ? decodeURIComponent(errorMessage) : '';
          const userFriendlyMsg =
            errorCode === '4001'
              ? 'Người dùng đã hủy hoặc từ chối yêu cầu trên ví Phantom.'
              : `Ví Phantom trả về mã lỗi [${errorCode}]: ${decodedMsg || 'Yêu cầu bị từ chối'}`;
          console.warn('⚠️ [WalletProvider] Phantom error callback:', userFriendlyMsg);
          throw new Error(userFriendlyMsg);
        }

        // 1. Bắt Deep Link Callback (onConnect - Phase 2)
        if (event.url.includes('onConnect') || parsed.path?.includes('onConnect')) {
          const phantomEncryptionPubKey = getParam('phantom_encryption_public_key');
          const nonce = getParam('nonce');
          const data = getParam('data');

          console.log('📥 [Phase 2] Nhận callback onConnect với nonce:', nonce);

          if (!phantomEncryptionPubKey || !nonce || !data) {
            console.warn('⚠️ [Phase 2] Callback onConnect thiếu tham số mã hóa cần thiết, bỏ qua.');
            return;
          }

          if (!dappKeyPairRef.current) {
            throw new Error('Không tìm thấy dappKeyPair của phiên kết nối hiện tại. Vui lòng kết nối lại.');
          }

          // Tạo sharedSecret từ private key của Dapp và public key của Phantom (nacl.box.before)
          const sharedSec = nacl.box.before(
            bs58.decode(phantomEncryptionPubKey),
            dappKeyPairRef.current.secretKey
          );

          // Giải mã biến data (nacl.box.open.after)
          const decrypted = nacl.box.open.after(
            bs58.decode(data),
            bs58.decode(nonce),
            sharedSec
          );

          if (!decrypted) {
            throw new Error('Không thể giải mã dữ liệu xác thực từ ví Phantom. Phiên kết nối không hợp lệ.');
          }

          // Trích xuất session và public_key
          const decoded: { public_key: string; session: string } = JSON.parse(
            Buffer.from(decrypted).toString('utf8')
          );

          const userPubkey = new PublicKey(decoded.public_key);

          // Lưu session, sharedSecret, và public_key vào useRef, State và AsyncStorage
          sharedSecretRef.current = sharedSec;
          sessionTokenRef.current = decoded.session;
          publicKeyRef.current = userPubkey;

          setPublicKey(userPubkey);
          setConnecting(false);
          setWalletType('phantom');

          // Lưu vào AsyncStorage để duy trì kết nối xuyên suốt các màn hình
          AsyncStorage.multiSet([
            [PHANTOM_STORAGE_KEYS.PUBKEY, userPubkey.toBase58()],
            [PHANTOM_STORAGE_KEYS.SESSION, decoded.session],
            [PHANTOM_STORAGE_KEYS.SHARED_SECRET, bs58.encode(sharedSec)],
            [PHANTOM_STORAGE_KEYS.DAPP_SECRET_KEY, bs58.encode(dappKeyPairRef.current.secretKey)],
          ]).catch((err) => console.warn('⚠️ [WalletProvider] Lỗi lưu session ví Phantom:', err));

          // Đồng bộ vào useUserStore
          try {
            useUserStore.getState().setWalletAddress(userPubkey.toBase58());
          } catch {}

          console.log('✅ [Phase 2] Handshake thành công! Public Key:', userPubkey.toBase58());

          if (pendingConnectRef.current) {
            pendingConnectRef.current.resolve(userPubkey);
            pendingConnectRef.current = null;
          }
        }

        // 2. Bắt Deep Link Callback (onSignMessage - Phase 3)
        if (event.url.includes('onSignMessage') || parsed.path?.includes('onSignMessage')) {
          const nonce = getParam('nonce');
          const data = getParam('data');

          console.log('📥 [Phase 3] Nhận callback onSignMessage với nonce:', nonce);

          if (!nonce || !data) {
            console.warn('⚠️ [Phase 3] Callback onSignMessage thiếu tham số nonce hoặc data, bỏ qua.');
            return;
          }

          const sec = sharedSecretRef.current;
          if (!sec) {
            throw new Error('Không tìm thấy sharedSecret của phiên kết nối. Vui lòng kết nối lại ví.');
          }

          // Giải mã payload trả về để thu được signature (nacl.box.open.after)
          const decrypted = nacl.box.open.after(
            bs58.decode(data),
            bs58.decode(nonce),
            sec
          );

          if (!decrypted) {
            throw new Error('Không thể giải mã chữ ký trả về từ ví Phantom.');
          }

          const decoded: { signature: string } = JSON.parse(
            Buffer.from(decrypted).toString('utf8')
          );

          // Chữ ký trả về từ Phantom đã là Base58, không bọc bs58.encode() thêm lần nữa
          const sigBase58 = decoded.signature;
          console.log('✅ [Phase 3] Nhận chữ ký Base58 thành công:', sigBase58);

          if (pendingSignMessageRef.current) {
            pendingSignMessageRef.current.resolve(sigBase58);
            pendingSignMessageRef.current = null;
          }
        }

        // 3. Bắt Deep Link Callback (onSignTransaction - Ký giao dịch Phantom)
        if (event.url.includes('onSignTransaction') || parsed.path?.includes('onSignTransaction')) {
          const nonce = getParam('nonce');
          const data = getParam('data');

          console.log('📥 [Phantom onSignTransaction] Nhận callback với nonce:', nonce);

          if (!nonce || !data) {
            console.warn('⚠️ [Phantom onSignTransaction] Callback thiếu tham số nonce hoặc data, bỏ qua.');
            return;
          }

          const sec = sharedSecretRef.current;
          if (!sec) {
            throw new Error('Không tìm thấy sharedSecret của phiên kết nối Phantom. Vui lòng kết nối lại ví.');
          }

          // Giải mã payload trả về để thu được transaction đã ký
          const decrypted = nacl.box.open.after(
            bs58.decode(data),
            bs58.decode(nonce),
            sec
          );

          if (!decrypted) {
            throw new Error('Không thể giải mã giao dịch trả về từ ví Phantom.');
          }

          const decoded: { transaction: string } = JSON.parse(
            Buffer.from(decrypted).toString('utf8')
          );

          const txBuffer = bs58.decode(decoded.transaction);
          let signedTx: any;
          try {
            signedTx = Transaction.from(txBuffer);
          } catch {
            signedTx = VersionedTransaction.deserialize(txBuffer);
          }

          console.log('✅ [Phantom onSignTransaction] Giải mã giao dịch đã ký thành công!');

          if (pendingSignTransactionRef.current) {
            pendingSignTransactionRef.current.resolve(signedTx);
            pendingSignTransactionRef.current = null;
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
        console.warn('⚠️ [WalletProvider Error Callback]:', errorMsg);
        setConnecting(false);
        if (pendingConnectRef.current) {
          pendingConnectRef.current.reject(new Error(errorMsg));
          pendingConnectRef.current = null;
        }
        if (pendingSignMessageRef.current) {
          pendingSignMessageRef.current.reject(new Error(errorMsg));
          pendingSignMessageRef.current = null;
        }
        if (pendingSignTransactionRef.current) {
          pendingSignTransactionRef.current.reject(new Error(errorMsg));
          pendingSignTransactionRef.current = null;
        }
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => {
      sub.remove();
    };
  }, []);

  // Hàm khởi tạo kết nối (Handshake - Phase 2)
  const connect = useCallback(
    async (type: WalletType = 'phantom'): Promise<PublicKey | null> => {
      try {
        setConnecting(true);

        const keyPair = nacl.box.keyPair();
        dappKeyPairRef.current = keyPair;

        const dappEncryptionPubKey = bs58.encode(keyPair.publicKey);
        const cluster = currentCluster;
        const appUrl = process.env.EXPO_PUBLIC_SIWS_URI || 'https://ned.wallet';
        const redirectLink = LinkingExpo.createURL('onConnect');

        const params = new URLSearchParams({
          dapp_encryption_public_key: dappEncryptionPubKey,
          cluster,
          app_url: appUrl,
          redirect_link: redirectLink,
        });

        const fullUrl = `https://phantom.app/ul/v1/connect?${params.toString()}`;
        console.log(`🔗 [Phase 2] Mở Phantom Connect URL (Cluster: ${cluster}):`, fullUrl);

        try {
          await Linking.openURL(fullUrl);
          return new Promise<PublicKey>((resolve, reject) => {
            pendingConnectRef.current = { resolve, reject };
          });
        } catch (openErr) {
          setConnecting(false);
          console.error('❌ [Phase 2] Không thể mở ví Phantom:', openErr);
          Alert.alert(
            'Chưa phát hiện ví Phantom',
            'Không thể mở ví Phantom. Vui lòng đảm bảo ứng dụng ví Phantom đã được cài đặt trên thiết bị của bạn.'
          );
          return null;
        }
      } catch (err: unknown) {
        setConnecting(false);
        const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
        console.error('❌ [Phase 2 Connect Error]:', errorMsg);
        return null;
      }
    },
    [currentCluster]
  );

  // Hàm mã hóa & gửi thông điệp ký SIWS (Phase 3)
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      const sec = sharedSecretRef.current;
      const sess = sessionTokenRef.current;
      const keyPair = dappKeyPairRef.current;

      if (!sec || !sess || !keyPair) {
        throw new Error('Chưa thiết lập phiên Handshake kết nối ví (thiếu sharedSecret/session). Vui lòng kết nối lại.');
      }

      // 1. Mã hóa message bằng Buffer
      const encodedMessageForPhantom = bs58.encode(Buffer.from(message));
      console.log('🔑 [Phase 3] Base58 encoded message for Phantom:', encodedMessageForPhantom);

      // 2. Mã hóa payload gửi đi bằng khóa phiên (sharedSecret và nonce) theo chuẩn nacl.box
      const payload = {
        session: sess,
        message: encodedMessageForPhantom,
      };

      const nonce = nacl.randomBytes(24);
      const encrypted = nacl.box.after(
        Buffer.from(JSON.stringify(payload)),
        nonce,
        sec
      );

      const dappEncryptionPubKey = bs58.encode(keyPair.publicKey);
      const redirectLink = LinkingExpo.createURL('onSignMessage');
      const params = new URLSearchParams({
        dapp_encryption_public_key: dappEncryptionPubKey,
        nonce: bs58.encode(nonce),
        redirect_link: redirectLink,
        payload: bs58.encode(encrypted),
      });

      const fullUrl = `https://phantom.app/ul/v1/signMessage?${params.toString()}`;
      console.log('🔗 [Phase 3] Mở Phantom signMessage URL:', fullUrl);

      try {
        await Linking.openURL(fullUrl);
      } catch (openErr) {
        console.error('❌ [Phase 3] Không thể mở URL Phantom signMessage:', openErr);
        throw new Error('Không thể mở ứng dụng ví Phantom để thực hiện ký thông điệp.');
      }

      return new Promise<string>((resolve, reject) => {
        pendingSignMessageRef.current = { resolve, reject };
      });
    },
    []
  );

  // Hàm mã hóa & gửi Transaction sang Phantom để ký
  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
      const sec = sharedSecretRef.current;
      const sess = sessionTokenRef.current;
      const keyPair = dappKeyPairRef.current;

      if (!sec || !sess || !keyPair) {
        throw new Error('Chưa thiết lập phiên kết nối với ví Phantom (thiếu secret/session). Vui lòng kết nối lại ví.');
      }

      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      const encodedTx = bs58.encode(Buffer.from(serialized));

      const payload = {
        session: sess,
        transaction: encodedTx,
      };

      const nonce = nacl.randomBytes(24);
      const encrypted = nacl.box.after(
        Buffer.from(JSON.stringify(payload)),
        nonce,
        sec
      );

      const dappEncryptionPubKey = bs58.encode(keyPair.publicKey);
      const redirectLink = LinkingExpo.createURL('onSignTransaction');
      const params = new URLSearchParams({
        dapp_encryption_public_key: dappEncryptionPubKey,
        nonce: bs58.encode(nonce),
        redirect_link: redirectLink,
        payload: bs58.encode(encrypted),
      });

      const fullUrl = `https://phantom.app/ul/v1/signTransaction?${params.toString()}`;
      console.log('🔗 [Phantom signTransaction] Mở URL ký giao dịch:', fullUrl);

      try {
        await Linking.openURL(fullUrl);
      } catch (openErr) {
        console.error('❌ [Phantom signTransaction] Không thể mở ví Phantom:', openErr);
        throw new Error('Không thể mở ứng dụng ví Phantom để xác nhận giao dịch.');
      }

      return new Promise<T>((resolve, reject) => {
        pendingSignTransactionRef.current = { resolve: resolve as any, reject };
      });
    },
    []
  );

  const signAllTransactions = useCallback(
    async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
      const signed: T[] = [];
      for (const tx of txs) {
        signed.push(await signTransaction(tx));
      }
      return signed;
    },
    [signTransaction]
  );

  const cancelConnecting = useCallback(() => {
    setConnecting(false);
    if (pendingConnectRef.current) {
      pendingConnectRef.current.reject(new Error('Đã hủy phiên kết nối ví.'));
      pendingConnectRef.current = null;
    }
    if (pendingSignMessageRef.current) {
      pendingSignMessageRef.current.reject(new Error('Đã hủy yêu cầu ký thông điệp.'));
      pendingSignMessageRef.current = null;
    }
    if (pendingSignTransactionRef.current) {
      pendingSignTransactionRef.current.reject(new Error('Đã hủy yêu cầu ký giao dịch.'));
      pendingSignTransactionRef.current = null;
    }
  }, []);

  const disconnect = useCallback(async (revokePhantomSession: boolean = false) => {
    try {
      if (
        revokePhantomSession &&
        sessionTokenRef.current &&
        sharedSecretRef.current &&
        dappKeyPairRef.current
      ) {
        const payload = { session: sessionTokenRef.current };
        const nonce = nacl.randomBytes(24);
        const encrypted = nacl.box.after(
          Buffer.from(JSON.stringify(payload)),
          nonce,
          sharedSecretRef.current
        );
        const dappEncryptionPubKey = bs58.encode(dappKeyPairRef.current.publicKey);
        const redirectLink = LinkingExpo.createURL('login');
        const params = new URLSearchParams({
          dapp_encryption_public_key: dappEncryptionPubKey,
          nonce: bs58.encode(nonce),
          redirect_link: redirectLink,
          payload: bs58.encode(encrypted),
        });
        const fullUrl = `https://phantom.app/ul/v1/disconnect?${params.toString()}`;
        console.log('🔗 [Phantom Disconnect] Gửi yêu cầu ngắt kết nối:', fullUrl);
        await Linking.openURL(fullUrl);
      }
    } catch (e) {
      console.warn('⚠️ [Phantom Disconnect] Lỗi khi gửi disconnect deeplink:', e);
    } finally {
      publicKeyRef.current = null;
      sharedSecretRef.current = null;
      sessionTokenRef.current = null;
      dappKeyPairRef.current = null;
      if (pendingConnectRef.current) {
        pendingConnectRef.current.reject(new Error('Phiên kết nối ví đã kết thúc.'));
        pendingConnectRef.current = null;
      }
      if (pendingSignMessageRef.current) {
        pendingSignMessageRef.current.reject(new Error('Phiên kết nối ví đã kết thúc.'));
        pendingSignMessageRef.current = null;
      }
      if (pendingSignTransactionRef.current) {
        pendingSignTransactionRef.current.reject(new Error('Phiên kết nối ví đã kết thúc.'));
        pendingSignTransactionRef.current = null;
      }
      setPublicKey(null);
      setConnecting(false);
      setWalletType(null);

      // Xóa bộ nhớ AsyncStorage
      AsyncStorage.multiRemove([
        PHANTOM_STORAGE_KEYS.PUBKEY,
        PHANTOM_STORAGE_KEYS.SESSION,
        PHANTOM_STORAGE_KEYS.SHARED_SECRET,
        PHANTOM_STORAGE_KEYS.DAPP_SECRET_KEY,
      ]).catch(() => {});

      console.log('🧹 [WalletProvider] Đã dọn dẹp sạch toàn bộ State & Secret ví Phantom');
    }
  }, []);

  const anchorWallet: AnchorWallet | null = useMemo(() => {
    if (!publicKey) return null;
    return {
      publicKey,
      signTransaction,
      signAllTransactions,
    };
  }, [publicKey, signTransaction, signAllTransactions]);

  const contextValue: WalletContextState = useMemo(
    () => ({
      publicKey,
      connected: !!publicKey,
      connecting,
      walletType,
      walletName: walletType ? 'Phantom Wallet' : null,
      anchorWallet,
      cluster: currentCluster,
      connect,
      cancelConnecting,
      disconnect,
      signMessage,
      signTransaction,
      signAllTransactions,
    }),
    [publicKey, connecting, walletType, anchorWallet, currentCluster, connect, cancelConnecting, disconnect, signMessage, signTransaction, signAllTransactions]
  );

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
};

export function useExternalWallet(): WalletContextState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useExternalWallet phải được sử dụng bên trong <WalletProvider>');
  }
  return context;
}

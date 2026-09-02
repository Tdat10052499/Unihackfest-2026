import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;

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
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

import { AnchorWallet } from '../utils/anchorClient';

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
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

const WalletContext = createContext<WalletContextState | null>(null);

export interface WalletProviderProps {
  children: ReactNode;
  defaultCluster?: 'devnet' | 'mainnet-beta';
}

/**
 * Phase 2 & 3: Handshake, Kết nối Phantom & Ký thông điệp SIWS
 */
export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  defaultCluster = 'devnet',
}) => {
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

  // Lắng nghe callback Deep Link từ Phantom (onConnect & onSignMessage)
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        if (!event.url) return;

        const parsed = LinkingExpo.parse(event.url);
        const params = new URLSearchParams(
          event.url.includes('?') ? event.url.split('?')[1] : ''
        );

        // 1. Bắt Deep Link Callback (onConnect - Phase 2)
        if (event.url.includes('onConnect') || parsed.path?.includes('onConnect')) {
          const phantomEncryptionPubKey = params.get('phantom_encryption_public_key');
          const nonce = params.get('nonce');
          const data = params.get('data');

          console.log('📥 [Phase 2] Nhận callback onConnect với nonce:', nonce);

          if (!phantomEncryptionPubKey || !nonce || !data) {
            throw new Error('Thiếu tham số mã hóa từ phản hồi onConnect của Phantom.');
          }

          if (!dappKeyPairRef.current) {
            throw new Error('Không tìm thấy dappKeyPair của phiên kết nối hiện tại.');
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
            throw new Error('Không thể giải mã dữ liệu xác thực từ ví Phantom.');
          }

          // Trích xuất session và public_key
          const decoded: { public_key: string; session: string } = JSON.parse(
            Buffer.from(decrypted).toString('utf8')
          );

          const userPubkey = new PublicKey(decoded.public_key);

          // Lưu session, sharedSecret, và public_key vào useRef và State
          sharedSecretRef.current = sharedSec;
          sessionTokenRef.current = decoded.session;
          publicKeyRef.current = userPubkey;

          setPublicKey(userPubkey);
          setConnecting(false);
          setWalletType('phantom');

          console.log('✅ [Phase 2] Handshake thành công! Public Key:', userPubkey.toBase58());

          if (pendingConnectRef.current) {
            pendingConnectRef.current.resolve(userPubkey);
            pendingConnectRef.current = null;
          }
        }

        // 2. Bắt Deep Link Callback (onSignMessage - Phase 3)
        if (event.url.includes('onSignMessage') || parsed.path?.includes('onSignMessage')) {
          const nonce = params.get('nonce');
          const data = params.get('data');

          console.log('📥 [Phase 3] Nhận callback onSignMessage với nonce:', nonce);

          if (!nonce || !data) {
            throw new Error('Thiếu tham số mã hóa từ phản hồi onSignMessage của Phantom.');
          }

          const sec = sharedSecretRef.current;
          if (!sec) {
            throw new Error('Không tìm thấy sharedSecret của phiên kết nối.');
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
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
        console.error('❌ [WalletProvider Error Details]:', errorMsg);
        setConnecting(false);
        if (pendingConnectRef.current) {
          pendingConnectRef.current.reject(new Error(errorMsg));
          pendingConnectRef.current = null;
        }
        if (pendingSignMessageRef.current) {
          pendingSignMessageRef.current.reject(new Error(errorMsg));
          pendingSignMessageRef.current = null;
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
        const cluster = 'devnet';
        const appUrl = 'https://ned.wallet';
        const redirectLink = LinkingExpo.createURL('onConnect');

        const params = new URLSearchParams({
          dapp_encryption_public_key: dappEncryptionPubKey,
          cluster,
          app_url: appUrl,
          redirect_link: redirectLink,
        });

        const fullUrl = `https://phantom.app/ul/v1/connect?${params.toString()}`;
        console.log('🔗 [Phase 2] Mở Phantom Connect URL:', fullUrl);

        const canOpen = await Linking.canOpenURL(fullUrl);
        if (canOpen) {
          await Linking.openURL(fullUrl);
          return new Promise<PublicKey>((resolve, reject) => {
            pendingConnectRef.current = { resolve, reject };
          });
        } else {
          setConnecting(false);
          Alert.alert(
            'Chưa phát hiện ví Phantom',
            'Vui lòng cài đặt ứng dụng ví Phantom trên thiết bị của bạn để tiếp tục.'
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
    []
  );

  // Hàm mã hóa & gửi thông điệp ký SIWS (Phase 3)
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      const sec = sharedSecretRef.current;
      const sess = sessionTokenRef.current;
      const keyPair = dappKeyPairRef.current;

      if (!sec || !sess || !keyPair) {
        throw new Error('Chưa thiết lập phiên Handshake kết nối ví (thiếu sharedSecret/session).');
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

      await Linking.openURL(fullUrl);

      return new Promise<string>((resolve, reject) => {
        pendingSignMessageRef.current = { resolve, reject };
      });
    },
    []
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
  }, []);

  const disconnect = useCallback(async () => {
    publicKeyRef.current = null;
    sharedSecretRef.current = null;
    sessionTokenRef.current = null;
    dappKeyPairRef.current = null;
    setPublicKey(null);
    setConnecting(false);
    setWalletType(null);
  }, []);

  const anchorWallet: AnchorWallet | null = useMemo(() => {
    if (!publicKey) return null;
    return {
      publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => tx,
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => txs,
    };
  }, [publicKey]);

  const contextValue: WalletContextState = useMemo(
    () => ({
      publicKey,
      connected: !!publicKey,
      connecting,
      walletType,
      walletName: walletType ? 'Phantom Wallet' : null,
      anchorWallet,
      cluster: defaultCluster,
      connect,
      cancelConnecting,
      disconnect,
      signMessage,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => tx,
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => txs,
    }),
    [publicKey, connecting, walletType, anchorWallet, defaultCluster, connect, cancelConnecting, disconnect, signMessage]
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

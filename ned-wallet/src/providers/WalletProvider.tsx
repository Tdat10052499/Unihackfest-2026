import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { Linking, Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
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
  disconnect: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

const STORAGE_KEYS = {
  PUBLIC_KEY: '@ned_wallet_external_pubkey',
  WALLET_TYPE: '@ned_wallet_external_type',
  SESSION_TOKEN: '@ned_wallet_external_session',
  DAPP_SECRET_KEY: '@ned_wallet_dapp_secret_key',
  SHARED_SECRET: '@ned_wallet_shared_secret',
};

const WalletContext = createContext<WalletContextState | null>(null);

export interface WalletProviderProps {
  children: ReactNode;
  defaultCluster?: 'devnet' | 'mainnet-beta';
}

/**
 * Global Wallet Provider hỗ trợ kết nối ví Solana bên ngoài (Phantom, Solflare, Backpack, MWA)
 * qua chuẩn Deep Linking và Solana Mobile Wallet Adapter
 */
export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  defaultCluster = 'devnet',
}) => {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [dappKeyPair, setDappKeyPair] = useState<nacl.BoxKeyPair | null>(null);
  const [sharedSecret, setSharedSecret] = useState<Uint8Array | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Khởi tạo hoặc nạp DApp Keypair từ Local Storage
  useEffect(() => {
    const initKeyPair = async () => {
      try {
        const storedSecret = await AsyncStorage.getItem(STORAGE_KEYS.DAPP_SECRET_KEY);
        if (storedSecret) {
          const secretBytes = bs58.decode(storedSecret);
          const keyPair = nacl.box.keyPair.fromSecretKey(secretBytes);
          setDappKeyPair(keyPair);
        } else {
          const keyPair = nacl.box.keyPair();
          await AsyncStorage.setItem(
            STORAGE_KEYS.DAPP_SECRET_KEY,
            bs58.encode(keyPair.secretKey)
          );
          setDappKeyPair(keyPair);
        }

        // Khôi phục session kết nối nếu có
        const savedPubkey = await AsyncStorage.getItem(STORAGE_KEYS.PUBLIC_KEY);
        const savedType = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_TYPE) as WalletType;
        const savedSession = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
        const savedSharedSecret = await AsyncStorage.getItem(STORAGE_KEYS.SHARED_SECRET);

        if (savedPubkey && savedType) {
          setPublicKey(new PublicKey(savedPubkey));
          setWalletType(savedType);
          if (savedSession) setSessionToken(savedSession);
          if (savedSharedSecret) setSharedSecret(bs58.decode(savedSharedSecret));
        }
      } catch (err) {
        console.error('[WalletProvider] Lỗi khôi phục session:', err);
      }
    };

    initKeyPair();
  }, []);

  // Xử lý deep link callback từ Phantom/Solflare/Backpack
  const handleDeepLink = useCallback(
    async (event: { url: string }) => {
      if (!event.url || !dappKeyPair) return;

      try {
        const parsedUrl = new URL(event.url);
        const params = parsedUrl.searchParams;

        // Xử lý lỗi trả về từ ví
        const errorCode = params.get('errorCode');
        const errorMessage = params.get('errorMessage');
        if (errorCode || errorMessage) {
          console.warn('[WalletProvider] Lỗi từ ví:', errorCode, errorMessage);
          setConnecting(false);
          Alert.alert('Kết nối ví không thành công', errorMessage || 'Người dùng đã hủy xác nhận.');
          return;
        }

        // 1. Phản hồi Connect
        if (event.url.includes('onConnect') || params.get('phantom_encryption_public_key')) {
          const phantomEncryptionPubKey = params.get('phantom_encryption_public_key');
          const data = params.get('data');
          const nonce = params.get('nonce');

          if (phantomEncryptionPubKey && data && nonce) {
            const sharedSec = nacl.box.before(
              bs58.decode(phantomEncryptionPubKey),
              dappKeyPair.secretKey
            );

            const decrypted = nacl.box.open.after(
              bs58.decode(data),
              bs58.decode(nonce),
              sharedSec
            );

            if (decrypted) {
              const decoded = JSON.parse(Buffer.from(decrypted).toString('utf8'));
              const connectedPubkey = new PublicKey(decoded.public_key);
              const session = decoded.session;

              setPublicKey(connectedPubkey);
              setSharedSecret(sharedSec);
              setSessionToken(session);
              setConnecting(false);

              await AsyncStorage.setItem(STORAGE_KEYS.PUBLIC_KEY, connectedPubkey.toBase58());
              if (session) await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, session);
              await AsyncStorage.setItem(STORAGE_KEYS.SHARED_SECRET, bs58.encode(sharedSec));
            }
          }
        }
      } catch (err) {
        console.error('[WalletProvider] Lỗi xử lý callback deep link:', err);
        setConnecting(false);
      }
    },
    [dappKeyPair]
  );

  // Đăng ký event listener lắng nghe URL
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  /**
   * Kết nối với ví bên ngoài (Phantom, Solflare, Backpack, MWA)
   */
  const connect = useCallback(
    async (type: WalletType = 'phantom'): Promise<PublicKey | null> => {
      if (!dappKeyPair) {
        Alert.alert('Lỗi', 'Chưa khởi tạo được mã khóa bảo mật của ứng dụng.');
        return null;
      }

      setConnecting(true);
      setWalletType(type);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_TYPE, type);

      const redirectLink = LinkingExpo.createURL('onConnect');
      const dappEncryptionPubKey = bs58.encode(dappKeyPair.publicKey);
      const appUrl = 'https://ned.wallet';
      const cluster = defaultCluster;

      let baseUrl = 'https://phantom.app/ul/v1/connect';
      if (type === 'solflare') {
        baseUrl = 'https://solflare.com/ul/v1/connect';
      } else if (type === 'backpack') {
        baseUrl = 'https://backpack.app/ul/v1/connect';
      }

      const params = new URLSearchParams({
        dapp_encryption_public_key: dappEncryptionPubKey,
        cluster,
        app_url: appUrl,
        redirect_link: redirectLink,
      });

      const fullUrl = `${baseUrl}?${params.toString()}`;

      try {
        const canOpen = await Linking.canOpenURL(fullUrl);
        if (canOpen) {
          await Linking.openURL(fullUrl);
        } else {
          Alert.alert(
            `Chưa phát hiện ứng dụng ${type.toUpperCase()}`,
            `Bạn có muốn chuyển đến cửa hàng để tải ứng dụng ${type.toUpperCase()} không?`,
            [
              { text: 'Hủy', style: 'cancel', onPress: () => setConnecting(false) },
              {
                text: 'Tải Ứng Dụng',
                onPress: () => {
                  setConnecting(false);
                  const storeUrl =
                    type === 'phantom'
                      ? Platform.OS === 'ios'
                        ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
                        : 'https://play.google.com/store/apps/details?id=app.phantom'
                      : type === 'solflare'
                      ? Platform.OS === 'ios'
                        ? 'https://apps.apple.com/app/solflare-solana-wallet/id1580902721'
                        : 'https://play.google.com/store/apps/details?id=com.solflare.mobile'
                      : Platform.OS === 'ios'
                      ? 'https://apps.apple.com/app/backpack-crypto-wallet/id6445848196'
                      : 'https://play.google.com/store/apps/details?id=app.backpack.mobile';
                  Linking.openURL(storeUrl);
                },
              },
            ]
          );
        }
      } catch (err) {
        console.error('[WalletProvider] Lỗi mở deep link kết nối:', err);
        setConnecting(false);
        Alert.alert('Không thể kết nối ví', 'Vui lòng kiểm tra lại ứng dụng ví trên thiết bị.');
      }

      return null;
    },
    [dappKeyPair, defaultCluster]
  );

  /**
   * Ngắt kết nối ví
   */
  const disconnect = useCallback(async () => {
    setPublicKey(null);
    setWalletType(null);
    setSharedSecret(null);
    setSessionToken(null);
    setConnecting(false);

    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PUBLIC_KEY,
      STORAGE_KEYS.WALLET_TYPE,
      STORAGE_KEYS.SESSION_TOKEN,
      STORAGE_KEYS.SHARED_SECRET,
    ]);
  }, []);

  /**
   * Ký giao dịch đơn qua Deep Link / MWA
   */
  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (!publicKey || !sharedSecret || !sessionToken || !dappKeyPair) {
        throw new Error('Ví chưa được kết nối hoặc thiếu phiên xác thực.');
      }

      const serializedTx = 'serialize' in tx
        ? Buffer.from((tx as Transaction).serialize({ requireAllSignatures: false }))
        : Buffer.from((tx as VersionedTransaction).serialize());

      const payload = {
        session: sessionToken,
        transaction: bs58.encode(serializedTx),
      };

      const nonce = nacl.randomBytes(24);
      const encrypted = nacl.box.after(
        Buffer.from(JSON.stringify(payload)),
        nonce,
        sharedSecret
      );

      const redirectLink = LinkingExpo.createURL('onSignTransaction');
      const dappEncryptionPubKey = bs58.encode(dappKeyPair.publicKey);
      const baseUrl = walletType === 'solflare'
        ? 'https://solflare.com/ul/v1/signTransaction'
        : walletType === 'backpack'
        ? 'https://backpack.app/ul/v1/signTransaction'
        : 'https://phantom.app/ul/v1/signTransaction';

      const params = new URLSearchParams({
        dapp_encryption_public_key: dappEncryptionPubKey,
        nonce: bs58.encode(nonce),
        redirect_link: redirectLink,
        payload: bs58.encode(encrypted),
      });

      const fullUrl = `${baseUrl}?${params.toString()}`;
      await Linking.openURL(fullUrl);

      return tx;
    },
    [publicKey, sharedSecret, sessionToken, dappKeyPair, walletType]
  );

  /**
   * Ký danh sách nhiều giao dịch
   */
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

  // Tạo AnchorWallet tương thích cho Smart Contract
  const anchorWallet: AnchorWallet | null = useMemo(() => {
    if (!publicKey) return null;
    return {
      publicKey,
      signTransaction,
      signAllTransactions,
    };
  }, [publicKey, signTransaction, signAllTransactions]);

  const walletName = useMemo(() => {
    if (!walletType) return null;
    if (walletType === 'phantom') return 'Phantom';
    if (walletType === 'solflare') return 'Solflare';
    if (walletType === 'backpack') return 'Backpack';
    return 'Mobile Wallet Adapter';
  }, [walletType]);

  const value = useMemo(
    () => ({
      publicKey,
      connected: !!publicKey,
      connecting,
      walletType,
      walletName,
      anchorWallet,
      cluster: defaultCluster,
      connect,
      disconnect,
      signTransaction,
      signAllTransactions,
    }),
    [
      publicKey,
      connecting,
      walletType,
      walletName,
      anchorWallet,
      defaultCluster,
      connect,
      disconnect,
      signTransaction,
      signAllTransactions,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

/**
 * Hook truy xuất trạng thái kết nối ví bên ngoài
 */
export function useExternalWallet(): WalletContextState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useExternalWallet phải được sử dụng bên trong <WalletProvider>');
  }
  return context;
}

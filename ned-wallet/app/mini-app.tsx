import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { VersionedTransaction, Transaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

import { useWeb3Bridge, Web3BridgeMessage } from '../hooks/useWeb3Bridge';
import { MiniAppSignatureModal } from '../components/MiniAppSignatureModal';
import { resolveActiveSolanaAddress } from '../services/identity';
import { useExternalWallet } from '../src/providers/WalletProvider';
import { useUserStore } from '../stores/useUserStore';

export default function MiniAppViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const url = (params.url as string) || 'https://jup.ag';
  const title = (params.title as string) || 'Mini App';

  const webviewRef = useRef<WebView>(null);
  
  // States
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);
  const [webviewKey, setWebviewKey] = useState(0);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureRequest, setSignatureRequest] = useState<{ id: number; transaction: any } | null>(null);

  // Wallets
  const { user } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const externalWallet = useExternalWallet();
  
  const myAddress = resolveActiveSolanaAddress(
    user,
    externalWallet,
    solanaWalletState,
    useUserStore.getState().walletAddress
  );

  const { injectedJavaScript, generateResolveScript, generateRejectScript } = useWeb3Bridge(myAddress);

  // Prevent memory leak by unmounting when not focused
  useFocusEffect(
    useCallback(() => {
      setShouldRender(true);
      return () => {
        setShouldRender(false);
      };
    }, [])
  );

  const handleRefresh = () => {
    setWebviewKey(prev => prev + 1);
    setIsLoading(true);
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const onShouldStartLoadWithRequest = (request: any) => {
    const { url: reqUrl } = request;
    if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
      return true;
    }
    // Block deep links and unknown schemes
    Alert.alert('Bảo mật', 'Ứng dụng đã chặn một liên kết không an toàn.');
    return false;
  };

  const handleMessage = async (event: any) => {
    try {
      console.log('WebView Message received:', event.nativeEvent.data);
      const data: Web3BridgeMessage = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'connect') {
        if (myAddress) {
          const script = generateResolveScript(data.id, { publicKey: myAddress });
          webviewRef.current?.injectJavaScript(script);
        } else {
          webviewRef.current?.injectJavaScript(generateRejectScript(data.id, 'Ví chưa được kết nối'));
        }
      } 
      else if (data.type === 'signTransaction') {
        // Mở modal xác nhận
        setSignatureRequest({
          id: data.id,
          transaction: data.payload.transaction
        });
      }
      else if (data.type === 'disconnect') {
        webviewRef.current?.injectJavaScript(generateResolveScript(data.id, {}));
      }
      else {
        webviewRef.current?.injectJavaScript(generateRejectScript(data.id, 'Tính năng chưa được hỗ trợ trên N.E.D Wallet'));
      }
    } catch (e) {
      console.error('WebView message error:', e);
    }
  };

  const handleApproveSignature = async () => {
    if (!signatureRequest) return;
    
    setIsSigning(true);
    try {
      const { id, transaction: txData } = signatureRequest;
      
      // Khôi phục Transaction từ Array byte
      const txBuffer = Buffer.from(txData);
      let tx: any;
      try {
        tx = VersionedTransaction.deserialize(txBuffer);
      } catch {
        tx = Transaction.from(txBuffer);
      }

      // Khởi tạo provider
      let activeProvider: any = null;
      const currentWallets = solanaWalletState?.wallets || [];
      if (currentWallets.length > 0 && typeof currentWallets[0]?.getProvider === 'function') {
        activeProvider = await currentWallets[0].getProvider();
      } else if (typeof (solanaWalletState as any)?.getProvider === 'function') {
        activeProvider = await (solanaWalletState as any).getProvider();
      }

      if (!activeProvider && externalWallet?.connected) {
        activeProvider = externalWallet;
      }

      if (!activeProvider) {
        throw new Error('Không tìm thấy Provider để ký giao dịch.');
      }

      // Gọi hàm ký
      let signResult: any = null;
      if (typeof activeProvider.request === 'function') {
        signResult = await activeProvider.request({
          method: 'signTransaction',
          params: { transaction: tx },
        });
      } else if (typeof activeProvider.signTransaction === 'function') {
        signResult = await activeProvider.signTransaction(tx);
      }

      const signedTx = signResult?.signedTransaction || signResult;
      
      // Serialize signedTx to Array
      const signedBytes = Array.from(signedTx.serialize({ requireAllSignatures: false }));

      // Trả kết quả về WebView
      const script = generateResolveScript(id, { signedTx: signedBytes });
      webviewRef.current?.injectJavaScript(script);

    } catch (error: any) {
      console.error('Signature error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể ký giao dịch.');
      const script = generateRejectScript(signatureRequest.id, error.message || 'User rejected');
      webviewRef.current?.injectJavaScript(script);
    } finally {
      setIsSigning(false);
      setSignatureRequest(null);
    }
  };

  const handleRejectSignature = () => {
    if (signatureRequest) {
      const script = generateRejectScript(signatureRequest.id, 'Người dùng đã từ chối');
      webviewRef.current?.injectJavaScript(script);
      setSignatureRequest(null);
    }
  };

  // Trích xuất Domain để hiển thị trên Modal
  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return 'Ứng dụng';
    }
  };

  if (!shouldRender) {
    return <View style={styles.safeArea} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        
        <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <WebView
          key={webviewKey}
          ref={webviewRef}
          source={{ uri: url }}
          style={styles.webview}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
        />
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4500" />
            <Text style={styles.loadingText}>Đang tải N.E.D Mini-app...</Text>
          </View>
        )}
      </View>

      <MiniAppSignatureModal
        visible={!!signatureRequest}
        dappName={title}
        dappDomain={getDomain(url)}
        isSigning={isSigning}
        onApprove={handleApproveSignature}
        onReject={handleRejectSignature}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Nền xám nhạt (Tailwind Gray-100)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFBEB', // Nền màu kem
    borderBottomWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    zIndex: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  }
});

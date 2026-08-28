import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  usePrivy,
  useLoginWithEmail,
  useEmbeddedSolanaWallet,
} from '@privy-io/expo';
import {
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getSolanaBalance, solanaConnection } from '../services/solana';

export default function LoginScreen() {
  const { isReady, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const [permission, requestPermission] = useCameraPermissions();

  // State quản lý luồng đăng nhập
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'EMAIL_INPUT' | 'OTP_INPUT'>('EMAIL_INPUT');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  // State kiểm thử Devnet & On-chain
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [signatureResult, setSignatureResult] = useState('');
  const [isTestingSignature, setIsTestingSignature] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // State Giao diện MiniPay/World App (Scan & Receive Modal)
  const [showScanner, setShowScanner] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [showDevnetDetails, setShowDevnetDetails] = useState(false);

  // Trích xuất địa chỉ ví Solana dạng Base58
  const getSolanaWalletAddress = (): string | null => {
    if (!user) return null;

    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
      if (solWallet?.publicKey) return solWallet.publicKey;
    }

    const linkedAccounts =
      (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];

    const solanaAccount = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    if (solanaAccount?.address) {
      return solanaAccount.address;
    }

    if ((user as any)?.wallet?.address) {
      const addr = (user as any).wallet.address;
      if (!addr.startsWith('0x') || (user as any).wallet.chainType === 'solana') {
        return addr;
      }
    }

    return null;
  };

  const solanaAddress = getSolanaWalletAddress();

  // Tự động kiểm tra số dư khi phát hiện địa chỉ ví
  useEffect(() => {
    if (solanaAddress) {
      fetchBalance(solanaAddress);
    }
  }, [solanaAddress]);

  const fetchBalance = async (address: string) => {
    setIsLoadingBalance(true);
    try {
      const balance = await getSolanaBalance(address);
      setSolBalance(balance);
    } catch (err: any) {
      console.log('Error fetching Devnet balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Mở màn hình Camera quét mã QR
  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Quyền Camera',
          'Cần cấp quyền truy cập camera để quét mã QR thanh toán.'
        );
        return;
      }
    }
    setHasScanned(false);
    setShowScanner(true);
  };

  // Xử lý sự kiện khi quét thành công mã QR
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (hasScanned) return;
    setHasScanned(true);
    setShowScanner(false);
    console.log('Đã quét địa chỉ:', data);
    Alert.alert('Thành công', `Đã quét địa chỉ: ${data}`);
  };

  // Hàm tạo ví ngầm Solana thủ công
  const handleCreateSolanaWallet = async () => {
    setIsCreatingWallet(true);
    setErrorMessage('');
    try {
      if (solanaWalletState?.create) {
        await solanaWalletState.create();
      }
    } catch (err: any) {
      console.log('Error creating Solana embedded wallet:', err);
      setErrorMessage(err?.message || 'Không thể khởi tạo ví ngầm Solana.');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Luồng Ký và Gửi Giao dịch On-chain lên Solana Devnet
  const handleSendDevnetTransaction = async () => {
    if (!solanaAddress) return;
    setIsTestingSignature(true);
    setSignatureResult('');
    setIsCopied(false);
    setErrorMessage('');

    try {
      if (!solanaWalletState?.wallets || solanaWalletState.wallets.length === 0) {
        setSignatureResult('Ví nhúng Solana chưa sẵn sàng.');
        return;
      }

      const provider = await solanaWalletState.wallets[0].getProvider();
      const pubKey = new PublicKey(solanaAddress);

      // 1. Lấy recentBlockhash hợp lệ từ Devnet
      const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed');

      // 2. Tạo Transaction tự chuyển 1,000 lamports (0.000001 SOL)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: pubKey,
          toPubkey: pubKey,
          lamports: 1000,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = pubKey;

      // 3. Ký giao dịch thông qua Privy Embedded Solana Wallet Provider
      const { signedTransaction } = await provider.request({
        method: 'signTransaction',
        params: {
          transaction: transaction,
        },
      });

      // 4. Broadcast giao dịch đã ký lên Solana Devnet
      const rawBytes = signedTransaction.serialize();
      const txSignature = await solanaConnection.sendRawTransaction(rawBytes, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      if (txSignature) {
        setSignatureResult(txSignature);
        fetchBalance(solanaAddress);
      } else {
        setSignatureResult('Không thể broadcast giao dịch lên Solana Devnet.');
      }
    } catch (err: any) {
      console.error('Solana Devnet Transaction Error:', err);
      setErrorMessage(err?.message || 'Gửi giao dịch Devnet thất bại.');
      setSignatureResult(
        'Lỗi giao dịch: ' + (err?.message || 'Không thể broadcast giao dịch lên Devnet.')
      );
    } finally {
      setIsTestingSignature(false);
    }
  };

  // Sao chép Signature vào bộ nhớ tạm
  const handleCopySignature = async () => {
    if (!signatureResult) return;
    try {
      await Clipboard.setStringAsync(signatureResult);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.log('Copy error:', err);
    }
  };

  // Xử lý Bước 1: Gửi mã OTP
  const handleSendCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }
    setErrorMessage('');
    try {
      await sendCode({ email: trimmedEmail });
      setStep('OTP_INPUT');
    } catch (err: any) {
      console.log('Error sending OTP:', err);
      setErrorMessage(
        err?.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại email.'
      );
    }
  };

  // Xử lý Bước 2: Xác thực OTP
  const handleVerifyCode = async () => {
    const trimmedCode = otpCode.trim();
    const trimmedEmail = email.trim();
    if (!trimmedCode) {
      setErrorMessage('Vui lòng nhập mã OTP.');
      return;
    }
    setErrorMessage('');
    try {
      await loginWithCode({ code: trimmedCode, email: trimmedEmail });
    } catch (err: any) {
      console.log('Error verifying OTP:', err);
      setErrorMessage(
        err?.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.'
      );
    }
  };

  const handleBackToEmail = () => {
    setOtpCode('');
    setErrorMessage('');
    setStep('EMAIL_INPUT');
  };

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#9945FF" />
        <Text style={{ marginTop: 10, color: '#666' }}>
          Đang khởi tạo môi trường N.E.D...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {user ? (
        // Giao diện Màn hình chính MiniPay/World App (Tối giản & Hiện đại)
        <View style={styles.mainCard}>
          {/* Header Thông tin Người dùng */}
          <View style={styles.headerRow}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>Solana Devnet</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutPill}
              onPress={() => {
                setStep('EMAIL_INPUT');
                setEmail('');
                setOtpCode('');
                setSolBalance(null);
                setSignatureResult('');
                logout();
              }}
            >
              <Text style={styles.logoutPillText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>

          {/* Hiển thị Số dư Tổng Trung Tâm (MiniPay Style) */}
          <View style={styles.centerBalanceContainer}>
            <Text style={styles.balanceCaption}>SỐ DƯ KHẢ DỤNG</Text>
            <View style={styles.balanceBigRow}>
              {isLoadingBalance ? (
                <ActivityIndicator size="large" color="#14F195" />
              ) : (
                <Text style={styles.balanceBigText}>
                  {solBalance !== null ? `${solBalance.toFixed(4)}` : '0.0000'}
                </Text>
              )}
              <Text style={styles.solSymbol}>SOL</Text>
            </View>
            <TouchableOpacity
              onPress={() => solanaAddress && fetchBalance(solanaAddress)}
            >
              <Text style={styles.refreshText}>↻ Làm mới số dư</Text>
            </TouchableOpacity>
          </View>

          {/* 2 Nút Bấm Hành Động Chính: Gửi tiền & Nhận tiền */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, styles.sendBtn]}
              onPress={handleOpenScanner}
            >
              <Text style={styles.actionBtnIcon}>📷</Text>
              <Text style={styles.sendBtnText}>Gửi tiền (Scan QR)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryActionBtn, styles.receiveBtn]}
              onPress={() => setShowReceiveModal(true)}
            >
              <Text style={styles.actionBtnIcon}>QR</Text>
              <Text style={styles.receiveBtnText}>Nhận tiền (My QR)</Text>
            </TouchableOpacity>
          </View>

          {/* Địa chỉ Ví Rút Gọn */}
          {solanaAddress ? (
            <View style={styles.addressPill}>
              <Text style={styles.addressPillLabel}>Địa chỉ ví:</Text>
              <Text style={styles.addressPillValue}>
                {solanaAddress.slice(0, 6)}...{solanaAddress.slice(-6)}
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Button
                title={isCreatingWallet ? 'Đang tạo ví...' : 'Khởi tạo ví Solana ngầm'}
                onPress={handleCreateSolanaWallet}
                disabled={isCreatingWallet}
                color="#9945FF"
              />
            </View>
          )}

          {/* Phần Mở Rộng Kiểm Thử On-chain (Devnet Details) */}
          <TouchableOpacity
            style={styles.toggleDevnetBtn}
            onPress={() => setShowDevnetDetails(!showDevnetDetails)}
          >
            <Text style={styles.toggleDevnetText}>
              {showDevnetDetails ? '▲ Ẩn công cụ Devnet' : '▼ Công cụ kiểm thử Devnet'}
            </Text>
          </TouchableOpacity>

          {showDevnetDetails && solanaAddress && (
            <View style={styles.devnetSection}>
              <Text style={styles.sectionHeader}>Công cụ Kiểm thử On-chain</Text>
              <Button
                title={
                  isTestingSignature
                    ? 'Đang Ký & Gửi Giao Dịch...'
                    : 'Ký & Gửi Giao Dịch Thử (1,000 Lamports)'
                }
                onPress={handleSendDevnetTransaction}
                disabled={isTestingSignature}
                color="#9945FF"
              />

              {isTestingSignature && (
                <View style={{ marginTop: 10, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#14F195" />
                  <Text style={{ color: '#CCCCCC', fontSize: 12, marginTop: 4 }}>
                    Đang broadcast lên Solana Devnet...
                  </Text>
                </View>
              )}

              {signatureResult ? (
                <View style={styles.signatureContainer}>
                  <Text style={styles.signatureLabel}>Transaction Signature:</Text>
                  <TextInput
                    style={styles.signatureInput}
                    value={signatureResult}
                    editable={false}
                    multiline
                  />
                  <View style={{ marginTop: 6 }}>
                    <Button
                      title={isCopied ? 'Đã sao chép! ✓' : 'Sao chép Signature'}
                      onPress={handleCopySignature}
                      color="#198754"
                    />
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : (
        // Giao diện Đăng nhập Email OTP 2 Bước
        <View style={styles.mainCard}>
          <Text style={styles.title}>NorthAxis E-Wallet (N.E.D)</Text>

          {step === 'EMAIL_INPUT' ? (
            <View style={{ width: '100%' }}>
              <Text style={styles.subtitle}>
                Bước 1: Nhập email lấy mã xác thực
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button
                title={
                  state.status === 'sending-code'
                    ? 'Đang gửi mã...'
                    : 'Gửi mã xác thực'
                }
                onPress={handleSendCode}
                disabled={state.status === 'sending-code' || !email.trim()}
              />
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              <Text style={styles.subtitle}>Bước 2: Nhập mã OTP xác thực</Text>
              <Text
                style={{
                  marginBottom: 12,
                  fontSize: 13,
                  color: '#555',
                  textAlign: 'center',
                }}
              >
                Mã đã gửi đến: <Text style={{ fontWeight: 'bold' }}>{email}</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mã OTP..."
                value={otpCode}
                onChangeText={(text) => {
                  setOtpCode(text);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="number-pad"
              />
              <View style={{ gap: 10 }}>
                <Button
                  title={
                    state.status === 'submitting-code'
                      ? 'Đang xác thực...'
                      : 'Xác thực mã'
                  }
                  onPress={handleVerifyCode}
                  disabled={state.status === 'submitting-code' || !otpCode.trim()}
                />
                <Button
                  title="Quay lại"
                  onPress={handleBackToEmail}
                  color="#6c757d"
                />
              </View>
            </View>
          )}

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : state.status === 'error' && state.error ? (
            <Text style={styles.errorText}>
              {state.error.message || 'Xác thực thất bại, vui lòng thử lại.'}
            </Text>
          ) : null}
        </View>
      )}

      {/* Modal Nhận Tiền (My QR) */}
      <Modal visible={showReceiveModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiveCard}>
            <Text style={styles.modalTitle}>Nhận Tiền (My QR)</Text>
            <Text style={styles.modalSubtitle}>Chuẩn Solana Pay</Text>

            {solanaAddress ? (
              <View style={styles.qrBox}>
                <QRCode
                  value={solanaAddress}
                  size={200}
                  color="#1E1E2E"
                  backgroundColor="#FFFFFF"
                />
                <Text style={styles.fullAddressText}>{solanaAddress}</Text>
              </View>
            ) : (
              <Text style={{ marginVertical: 20, color: '#666' }}>
                Chưa phát hiện địa chỉ ví Solana.
              </Text>
            )}

            <View style={{ width: '100%', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={styles.copyAddressBtn}
                onPress={async () => {
                  if (solanaAddress) {
                    await Clipboard.setStringAsync(solanaAddress);
                    Alert.alert('Đã sao chép', 'Địa chỉ ví Solana đã được lưu vào bộ nhớ tạm.');
                  }
                }}
              >
                <Text style={styles.copyAddressBtnText}>Sao chép Địa chỉ Ví</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setShowReceiveModal(false)}
              >
                <Text style={styles.closeModalBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Quét Mã QR Camera */}
      <Modal visible={showScanner} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scanBoxFrame} />
              <Text style={styles.scanGuideText}>
                Hướng camera tới mã QR để quét
              </Text>
              <TouchableOpacity
                style={styles.closeCameraBtn}
                onPress={() => setShowScanner(false)}
              >
                <Text style={styles.closeCameraBtnText}>Đóng Camera</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    padding: 16,
  },
  mainCard: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeContainer: {
    backgroundColor: '#9945FF22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9945FF',
  },
  badgeText: {
    fontSize: 12,
    color: '#9945FF',
    fontWeight: 'bold',
  },
  logoutPill: {
    backgroundColor: '#dc354522',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logoutPillText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
  },
  centerBalanceContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  balanceCaption: {
    fontSize: 12,
    color: '#8888A0',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  balanceBigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceBigText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  solSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14F195',
    marginLeft: 8,
  },
  refreshText: {
    fontSize: 12,
    color: '#14F195',
    marginTop: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginVertical: 20,
  },
  primaryActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  sendBtn: {
    backgroundColor: '#14F195',
  },
  sendBtnText: {
    color: '#0F0F1A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  receiveBtn: {
    backgroundColor: '#9945FF',
  },
  receiveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionBtnIcon: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11111B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  addressPillLabel: {
    fontSize: 12,
    color: '#8888A0',
    marginRight: 6,
  },
  addressPillValue: {
    fontSize: 12,
    color: '#14F195',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  toggleDevnetBtn: {
    marginTop: 8,
    paddingVertical: 6,
  },
  toggleDevnetText: {
    fontSize: 12,
    color: '#8888A0',
  },
  devnetSection: {
    width: '100%',
    marginTop: 12,
    padding: 14,
    backgroundColor: '#11111B',
    borderRadius: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#9945FF',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  signatureContainer: {
    marginTop: 12,
    width: '100%',
  },
  signatureLabel: {
    fontSize: 12,
    color: '#FFD700',
    marginBottom: 4,
    fontWeight: '600',
  },
  signatureInput: {
    width: '100%',
    maxHeight: 100,
    backgroundColor: '#0F0F1A',
    color: '#FFD700',
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#33334D',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8888A0',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#33334D',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#11111B',
  },
  errorText: {
    marginTop: 14,
    color: '#dc3545',
    fontSize: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiveCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E2E',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 16,
  },
  qrBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  fullAddressText: {
    marginTop: 12,
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#1E1E2E',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  copyAddressBtn: {
    backgroundColor: '#14F195',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  copyAddressBtnText: {
    color: '#0F0F1A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeModalBtn: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanBoxFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#14F195',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanGuideText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 20,
    fontWeight: 'bold',
  },
  closeCameraBtn: {
    marginTop: 30,
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeCameraBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

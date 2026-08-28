import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
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
import * as Clipboard from 'expo-clipboard';
import { getSolanaBalance, solanaConnection } from '../services/solana';

export default function LoginScreen() {
  const { isReady, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const solanaWalletState = useEmbeddedSolanaWallet();

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

  // Tự động kiểm tra số dư khi phát hiện có địa chỉ ví
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

  // Hàm tạo ví ngầm Solana thủ công nếu chưa tự động tạo
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

  // Luồng Ký và Gửi Giao dịch On-chain lên Solana Devnet (Sign and Send Broadcast)
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

      // 1. Lấy recentBlockhash hợp lệ hiện tại từ Solana Devnet
      const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed');

      // 2. Tạo Transaction tự chuyển 1,000 lamports (0.000001 SOL) cho chính ví
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

      // 4. Broadcast giao dịch đã ký lên mạng lưới Solana Devnet
      const rawBytes = signedTransaction.serialize();
      const txSignature = await solanaConnection.sendRawTransaction(rawBytes, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      if (txSignature) {
        setSignatureResult(txSignature);
        // Cập nhật lại số dư sau khi broadcast thành công
        fetchBalance(solanaAddress);
      } else {
        setSignatureResult('Không thể broadcast giao dịch lên Solana Devnet.');
      }
    } catch (err: any) {
      console.error('Solana Devnet Transaction Error:', err);
      setErrorMessage(err?.message || 'Gửi giao dịch Devnet thất bại.');
      setSignatureResult('Lỗi giao dịch: ' + (err?.message || 'Không thể broadcast giao dịch lên Devnet.'));
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

  // Quay lại bước 1
  const handleBackToEmail = () => {
    setOtpCode('');
    setErrorMessage('');
    setStep('EMAIL_INPUT');
  };

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Đang khởi tạo môi trường...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {user ? (
        // Giao diện khi đã đăng nhập thành công
        <View style={styles.card}>
          <Text style={styles.title}>Đăng nhập thành công! ⚡</Text>

          <View style={styles.infoBox}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{user.id}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Ví Ngầm Solana (Base58):</Text>
            {solanaAddress ? (
              <Text style={styles.walletValue}>{solanaAddress}</Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.noWalletText}>
                  Chưa phát hiện ví Solana ngầm.
                </Text>
                <View style={{ marginTop: 8 }}>
                  <Button
                    title={
                      isCreatingWallet
                        ? 'Đang tạo ví Solana...'
                        : 'Khởi tạo ví Solana ngầm'
                    }
                    onPress={handleCreateSolanaWallet}
                    disabled={isCreatingWallet}
                    color="#9945FF"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Phần Kiểm Thử Solana Devnet */}
          {solanaAddress && (
            <View style={styles.devnetSection}>
              <Text style={styles.sectionHeader}>Mạng Lưới Solana Devnet</Text>

              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Số Dư On-chain:</Text>
                {isLoadingBalance ? (
                  <ActivityIndicator size="small" color="#9945FF" />
                ) : (
                  <Text style={styles.balanceValue}>
                    {solBalance !== null ? `${solBalance} SOL` : 'Chưa lấy dữ liệu'}
                  </Text>
                )}
              </View>

              <View style={{ marginTop: 10, gap: 8 }}>
                <Button
                  title={isLoadingBalance ? 'Đang đọc số dư...' : 'Kiểm tra số dư Devnet'}
                  onPress={() => fetchBalance(solanaAddress)}
                  disabled={isLoadingBalance}
                  color="#14F195"
                />

                <Button
                  title={
                    isTestingSignature
                      ? 'Đang Ký & Gửi Giao Dịch...'
                      : 'Ký & Gửi Giao Dịch Devnet'
                  }
                  onPress={handleSendDevnetTransaction}
                  disabled={isTestingSignature}
                  color="#9945FF"
                />
              </View>

              {/* Hiển thị Loading indicator khi đang xử lý giao dịch */}
              {isTestingSignature && (
                <View style={{ marginTop: 12, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#14F195" />
                  <Text style={{ color: '#CCCCCC', fontSize: 12, marginTop: 4 }}>
                    Đang lấy Blockhash và broadcast giao dịch lên Devnet...
                  </Text>
                </View>
              )}

              {/* Hiển thị Signature cuộn được và Nút Sao chép */}
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
                      title={isCopied ? 'Đã sao chép vào bộ nhớ tạm! ✓' : 'Sao chép Signature'}
                      onPress={handleCopySignature}
                      color="#198754"
                    />
                  </View>
                </View>
              ) : null}
            </View>
          )}

          <View style={{ marginTop: 24, width: '100%' }}>
            <Button
              title="Đăng xuất"
              onPress={() => {
                setStep('EMAIL_INPUT');
                setEmail('');
                setOtpCode('');
                setSolBalance(null);
                setSignatureResult('');
                setIsCopied(false);
                logout();
              }}
              color="#dc3545"
            />
          </View>
        </View>
      ) : (
        // Giao diện khi chưa đăng nhập
        <View style={styles.card}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoBox: {
    width: '100%',
    marginVertical: 6,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 13,
    color: '#212529',
    fontFamily: 'monospace',
  },
  walletValue: {
    fontSize: 13,
    color: '#14F195',
    backgroundColor: '#1E1E2E',
    padding: 8,
    borderRadius: 6,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  noWalletText: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  devnetSection: {
    width: '100%',
    marginTop: 12,
    padding: 14,
    backgroundColor: '#1E1E2E',
    borderRadius: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9945FF',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#CCCCCC',
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#14F195',
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
    backgroundColor: '#11111B',
    color: '#FFD700',
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#33334D',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  errorText: {
    marginTop: 14,
    color: '#dc3545',
    fontSize: 13,
    textAlign: 'center',
  },
});

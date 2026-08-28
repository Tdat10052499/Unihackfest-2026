import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  usePrivy,
  useLoginWithEmail,
  useEmbeddedEthereumWallet,
} from '@privy-io/expo';

export default function LoginScreen() {
  const { isReady, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const { wallets: ethWallets, create: createEthWallet } = useEmbeddedEthereumWallet();

  // Khai báo State quản lý luồng đăng nhập
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'EMAIL_INPUT' | 'OTP_INPUT'>('EMAIL_INPUT');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Đang khởi tạo môi trường...</Text>
      </View>
    );
  }

  // Hàm trích xuất địa chỉ ví ngầm từ nhiều nguồn của Privy SDK
  const getEmbeddedWalletAddress = (): string | null => {
    if (!user) return null;

    // 1. Kiểm tra trực tiếp trên user.wallet
    if ((user as any)?.wallet?.address) {
      return (user as any).wallet.address;
    }

    // 2. Kiểm tra từ hook useEmbeddedEthereumWallet
    if (ethWallets && ethWallets.length > 0 && ethWallets[0]?.address) {
      return ethWallets[0].address;
    }

    // 3. Kiểm tra từ linked_accounts / linkedAccounts
    const linkedAccounts =
      (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];

    const embeddedAcc = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.wallet_client_type === 'privy' ||
          acc.walletClientType === 'privy' ||
          acc.connector_type === 'embedded' ||
          acc.connectorType === 'embedded')
    );
    if (embeddedAcc?.address) {
      return embeddedAcc.address;
    }

    // 4. Bất kỳ tài khoản ví nào được liên kết
    const anyWallet = linkedAccounts.find((acc: any) => acc.type === 'wallet');
    if (anyWallet?.address) {
      return anyWallet.address;
    }

    return null;
  };

  const walletAddress = getEmbeddedWalletAddress();

  // Xử lý tạo ví ngầm thủ công nếu chưa có
  const handleCreateWallet = async () => {
    setIsCreatingWallet(true);
    setErrorMessage('');
    try {
      if (createEthWallet) {
        await createEthWallet();
      }
    } catch (err: any) {
      console.log('Error creating embedded wallet:', err);
      setErrorMessage(err?.message || 'Không thể khởi tạo ví ngầm.');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Xử lý Bước 1: Gửi mã OTP về email
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

  // Xử lý Bước 2: Xác thực mã OTP và đăng nhập
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

  // Quay lại bước nhập email
  const handleBackToEmail = () => {
    setOtpCode('');
    setErrorMessage('');
    setStep('EMAIL_INPUT');
  };

  return (
    <View style={styles.container}>
      {user ? (
        // Giao diện khi đã đăng nhập thành công
        <View style={styles.card}>
          <Text style={styles.title}>Đăng nhập thành công! 🎉</Text>

          <View style={styles.infoBox}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{user.id}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Địa chỉ Ví ngầm (Embedded Wallet):</Text>
            {walletAddress ? (
              <Text style={styles.walletValue}>{walletAddress}</Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.noWalletText}>Chưa phát hiện ví ngầm.</Text>
                <View style={{ marginTop: 8 }}>
                  <Button
                    title={isCreatingWallet ? 'Đang tạo ví...' : 'Khởi tạo ví ngầm ngay'}
                    onPress={handleCreateWallet}
                    disabled={isCreatingWallet}
                    color="#0d6efd"
                  />
                </View>
              </View>
            )}
          </View>

          <View style={{ marginTop: 24, width: '100%' }}>
            <Button
              title="Đăng xuất"
              onPress={() => {
                setStep('EMAIL_INPUT');
                setEmail('');
                setOtpCode('');
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
            // Giao diện Bước 1: Nhập Email
            <View style={{ width: '100%' }}>
              <Text style={styles.subtitle}>Bước 1: Nhập email lấy mã xác thực</Text>
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
            // Giao diện Bước 2: Nhập Mã OTP
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

          {/* Hiển thị lỗi nếu có */}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : state.status === 'error' && state.error ? (
            <Text style={styles.errorText}>
              {state.error.message || 'Xác thực thất bại, vui lòng thử lại.'}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginVertical: 8,
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
    color: '#198754',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  noWalletText: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
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

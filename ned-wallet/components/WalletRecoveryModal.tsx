import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRecoverEmbeddedWallet, useEmbeddedSolanaWallet } from '@privy-io/expo';

interface WalletRecoveryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WalletRecoveryModal: React.FC<WalletRecoveryModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { recover } = useRecoverEmbeddedWallet();
  const solanaWalletState = useEmbeddedSolanaWallet();

  const [mode, setMode] = useState<'CHOICE' | 'PASSCODE'>('CHOICE');
  const [passcode, setPasscode] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRecoverPrivy = async () => {
    try {
      setIsRecovering(true);
      setErrorMessage('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (typeof recover === 'function') {
        await recover({ recoveryMethod: 'privy' });
      } else if (typeof (solanaWalletState as any)?.recover === 'function') {
        await (solanaWalletState as any).recover();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Khôi phục thành công! 🎉',
        'Khóa bảo mật ví đã được đồng bộ lại trên thiết bị này. Bạn có thể tiếp tục thực hiện các giao dịch on-chain.',
        [
          {
            text: 'Tiếp tục',
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Lỗi khôi phục qua Privy:', err);
      // Nếu privy method yêu cầu passcode hoặc google drive
      if (err?.message?.includes('passcode') || err?.message?.includes('password')) {
        setMode('PASSCODE');
      } else {
        setErrorMessage(
          err?.message ||
            'Không thể tự động khôi phục. Vui lòng thử phương thức Google Drive hoặc Mật khẩu.'
        );
      }
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRecoverGoogleDrive = async () => {
    try {
      setIsRecovering(true);
      setErrorMessage('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (typeof recover === 'function') {
        await recover({ recoveryMethod: 'google-drive' });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Khôi phục thành công! 🎉',
        'Khóa bảo mật ví đã được đồng bộ từ Google Drive. Bạn có thể tiếp tục giao dịch.',
        [
          {
            text: 'Tiếp tục',
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Lỗi khôi phục Google Drive:', err);
      setErrorMessage(
        err?.message || 'Không thể khôi phục từ Google Drive. Vui lòng kiểm tra lại tài khoản.'
      );
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRecoverPasscode = async () => {
    if (!passcode.trim()) {
      setErrorMessage('Vui lòng nhập mật mã khôi phục của bạn');
      return;
    }

    try {
      setIsRecovering(true);
      setErrorMessage('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (typeof recover === 'function') {
        await recover({ recoveryMethod: 'user-passcode', password: passcode.trim() });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Khôi phục thành công! 🎉',
        'Ví đã được khôi phục thành công!',
        [
          {
            text: 'Tiếp tục',
            onPress: () => {
              setPasscode('');
              setMode('CHOICE');
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Lỗi khôi phục Passcode:', err);
      setErrorMessage(
        err?.message || 'Mật mã khôi phục không chính xác. Vui lòng thử lại.'
      );
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-key" size={36} color="#F59E0B" />
          </View>

          {/* Title & Desc */}
          <Text style={styles.titleText}>Thiết bị mới phát hiện</Text>
          <Text style={styles.descText}>
            Thiết bị của bạn vừa được cài đặt lại hoặc đăng nhập trên môi trường mới. Vui lòng khôi phục khóa bảo mật ví để tiếp tục ký các giao dịch on-chain.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {mode === 'CHOICE' ? (
            <View style={styles.actionsContainer}>
              {/* Option 1: Auto Cloud Sync */}
              <TouchableOpacity
                style={[styles.primaryActionBtn, isRecovering && styles.btnDisabled]}
                onPress={handleRecoverPrivy}
                disabled={isRecovering}
                activeOpacity={0.85}
              >
                {isRecovering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionBtnText}>Khôi phục tự động (Cloud)</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Option 2: Google Drive */}
              <TouchableOpacity
                style={[styles.secondaryActionBtn, isRecovering && styles.btnDisabled]}
                onPress={handleRecoverGoogleDrive}
                disabled={isRecovering}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-google" size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryActionBtnText}>Khôi phục từ Google Drive</Text>
              </TouchableOpacity>

              {/* Option 3: Passcode */}
              <TouchableOpacity
                style={styles.linkActionBtn}
                onPress={() => {
                  setErrorMessage('');
                  setMode('PASSCODE');
                }}
                disabled={isRecovering}
              >
                <Text style={styles.linkActionBtnText}>Sử dụng Mật khẩu / Passcode ví</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.passcodeContainer}>
              <Text style={styles.inputLabel}>Nhập mật khẩu khôi phục ví:</Text>
              <TextInput
                style={styles.passcodeInput}
                value={passcode}
                onChangeText={setPasscode}
                placeholder="Nhập mật khẩu của bạn..."
                placeholderTextColor="#64748B"
                secureTextEntry
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, isRecovering && styles.btnDisabled]}
                onPress={handleRecoverPasscode}
                disabled={isRecovering}
                activeOpacity={0.85}
              >
                {isRecovering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Xác nhận khôi phục</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkActionBtn}
                onPress={() => {
                  setErrorMessage('');
                  setMode('CHOICE');
                }}
                disabled={isRecovering}
              >
                <Text style={styles.linkActionBtnText}>Quay lại phương thức khác</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={isRecovering}
          >
            <Text style={styles.cancelBtnText}>Để sau</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  descText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#F87171',
    lineHeight: 18,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  passcodeContainer: {
    width: '100%',
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  passcodeInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  primaryActionBtn: {
    backgroundColor: '#00A859',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  linkActionBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  linkActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#64748B',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

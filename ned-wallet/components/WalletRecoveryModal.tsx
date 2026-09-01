import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRecoverEmbeddedWallet, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { useTranslation } from '../services/i18n';

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
  const { t } = useTranslation();
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
        t('recovery.successTitle', { defaultValue: 'Khôi phục thành công! 🎉' }),
        t('recovery.successDesc', { defaultValue: 'Khóa bảo mật ví đã được đồng bộ lại trên thiết bị này. Bạn có thể tiếp tục thực hiện các giao dịch on-chain.' }),
        [
          {
            text: t('recovery.continue', { defaultValue: 'Tiếp tục' }),
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Lỗi khôi phục qua Privy:', err);
      if (err?.message?.includes('passcode') || err?.message?.includes('password')) {
        setMode('PASSCODE');
      } else {
        setErrorMessage(
          err?.message ||
            'Không thể tự động khôi phục ví ngầm. Vui lòng thử khôi phục qua Google Drive hoặc Passcode.'
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
        t('recovery.successTitle', { defaultValue: 'Khôi phục thành công! 🎉' }),
        t('recovery.successDesc', { defaultValue: 'Khóa bảo mật ví đã được đồng bộ từ Google Drive. Bạn có thể tiếp tục giao dịch.' }),
        [
          {
            text: t('recovery.continue', { defaultValue: 'Tiếp tục' }),
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
      setErrorMessage(t('recovery.passcodeEmpty', { defaultValue: 'Vui lòng nhập mật mã khôi phục của bạn' }));
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
        t('recovery.successTitle', { defaultValue: 'Khôi phục thành công! 🎉' }),
        t('recovery.successDesc', { defaultValue: 'Ví đã được khôi phục thành công!' }),
        [
          {
            text: t('recovery.continue', { defaultValue: 'Tiếp tục' }),
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

  if (!visible) return null;

  return (
    <View style={styles.overlayWrapper} pointerEvents="box-none">
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
          <Text style={styles.titleText}>{t('recovery.title', { defaultValue: 'Thiết bị mới phát hiện' })}</Text>
          <Text style={styles.descText}>
            {t('recovery.desc', { defaultValue: 'Thiết bị của bạn vừa được cài đặt lại hoặc đăng nhập trên môi trường mới. Vui lòng khôi phục khóa bảo mật ví để tiếp tục ký các giao dịch on-chain.' })}
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
                    <Text style={styles.primaryActionBtnText}>{t('recovery.autoCloud', { defaultValue: 'Khôi phục tự động (Cloud)' })}</Text>
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
                <Text style={styles.secondaryActionBtnText}>{t('recovery.googleDrive', { defaultValue: 'Khôi phục từ Google Drive' })}</Text>
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
                <Text style={styles.linkActionBtnText}>{t('recovery.usePasscode', { defaultValue: 'Sử dụng Mật khẩu / Passcode ví' })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.passcodeContainer}>
              <Text style={styles.inputLabel}>{t('recovery.passcodeLabel', { defaultValue: 'Nhập mật khẩu khôi phục ví:' })}</Text>
              <TextInput
                style={styles.passcodeInput}
                value={passcode}
                onChangeText={setPasscode}
                placeholder={t('recovery.passcodePlaceholder', { defaultValue: 'Nhập mật khẩu của bạn...' })}
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
                  <Text style={styles.primaryActionBtnText}>{t('recovery.confirmPasscode', { defaultValue: 'Xác nhận khôi phục' })}</Text>
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
                <Text style={styles.linkActionBtnText}>{t('recovery.back', { defaultValue: 'Quay lại phương thức khác' })}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={isRecovering}
          >
            <Text style={styles.cancelBtnText}>{t('recovery.close', { defaultValue: 'Để sau' })}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  actionsContainer: {
    width: '100%',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A859',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    marginBottom: 10,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  linkActionBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  linkActionBtnText: {
    fontSize: 13,
    color: '#34D399',
    fontWeight: '600',
  },
  passcodeContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 8,
    fontWeight: '600',
  },
  passcodeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

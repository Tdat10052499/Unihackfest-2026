import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MiniAppSignatureModalProps {
  visible: boolean;
  dappName: string;
  dappDomain: string;
  isSigning: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function MiniAppSignatureModal({
  visible,
  dappName,
  dappDomain,
  isSigning,
  onApprove,
  onReject,
}: MiniAppSignatureModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#000000" />
            </View>
            <Text style={styles.title}>Yêu cầu chữ ký</Text>
          </View>
          
          <Text style={styles.description}>
            <Text style={styles.boldText}>{dappName}</Text> ({dappDomain}) đang yêu cầu bạn ký một giao dịch.
          </Text>

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color="#FF4500" style={styles.warningIcon} />
            <Text style={styles.warningText}>
              Hãy chắc chắn bạn tin tưởng ứng dụng này trước khi xác nhận. Giao dịch trên Blockchain không thể hoàn tác.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.rejectButton]} 
              onPress={onReject}
              disabled={isSigning}
            >
              <Text style={styles.rejectButtonText}>Từ chối</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.approveButton]} 
              onPress={onApprove}
              disabled={isSigning}
            >
              {isSigning ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.approveButtonText}>Chấp nhận</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E6F4FE',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  description: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 20,
  },
  boldText: {
    fontWeight: '800',
    color: '#000000',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: '#FF4500',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FF4500',
    fontWeight: '600',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  button: {
    flex: 1,
    height: 52,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  rejectButton: {
    backgroundColor: '#FFFFFF',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  approveButton: {
    backgroundColor: '#35165E', // Neo-brutalism Dark Purple
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

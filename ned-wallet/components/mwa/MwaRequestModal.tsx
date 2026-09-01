import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NeoCard } from '../neo/NeoCard';
import { NeoButton } from '../neo/NeoButton';
import { MwaRequest } from '../../services/mwa/mwaProtocol';
import { validateClusterGuard } from '../../services/mwa/clusterGuard';
import { SolanaNetwork } from '../../stores/useNetworkStore';
import { useRouter } from 'expo-router';

export interface MwaRequestModalProps {
  visible: boolean;
  request: MwaRequest | null;
  activeNetwork: SolanaNetwork;
  onApprove: (request: MwaRequest) => void;
  onReject: (request: MwaRequest, reason?: string) => void;
}

export const MwaRequestModal: React.FC<MwaRequestModalProps> = ({
  visible,
  request,
  activeNetwork,
  onApprove,
  onReject,
}) => {
  const router = useRouter();

  if (!request) return null;

  const clusterValidation = validateClusterGuard(request.cluster, activeNetwork);
  const isClusterMismatch = !clusterValidation.isValid;

  const getActionTitle = () => {
    switch (request.type) {
      case 'authorize':
        return 'Yêu Cầu Kết Nối Ví';
      case 'sign_transactions':
        return 'Yêu Cầu Ký Giao Dịch';
      case 'sign_and_send_transactions':
        return 'Ký & Gửi Giao Dịch On-chain';
      case 'sign_messages':
        return 'Yêu Cầu Ký Thông Điệp';
      default:
        return 'Yêu Cầu Từ MiniApp';
    }
  };

  const getActionSubtitle = () => {
    switch (request.type) {
      case 'authorize':
        return 'MiniApp muốn kết nối để xem địa chỉ ví N.E.D của bạn';
      case 'sign_transactions':
      case 'sign_and_send_transactions':
        return 'MiniApp gửi giao dịch Solana để bạn ký xác thực';
      case 'sign_messages':
        return 'MiniApp yêu cầu ký xác thực tin nhắn để chứng minh quyền sở hữu';
      default:
        return 'Vui lòng kiểm tra kỹ trước khi xác nhận';
    }
  };

  const handleApprove = () => {
    if (isClusterMismatch) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onApprove(request);
  };

  const handleReject = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onReject(request, 'User rejected MWA request');
  };

  const handleGoToSettings = () => {
    onReject(request, 'Redirecting to settings to switch cluster');
    router.push('/settings');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleReject}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <NeoCard
            backgroundColor="#F5EBE1"
            borderColor="#000000"
            shadowColor="#000000"
            borderWidth={3}
            borderRadius={24}
            offset={6}
            style={styles.cardContainer}
          >
            {/* Header Dialog */}
            <View style={styles.headerRow}>
              <View style={styles.appIconCircle}>
                <MaterialCommunityIcons name="wallet-outline" size={24} color="#000000" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.titleText}>{getActionTitle()}</Text>
                <Text style={styles.subtitleText}>{getActionSubtitle()}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleReject}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Thông tin dApp Identity */}
            <View style={styles.identityCard}>
              <Text style={styles.identityLabel}>Ứng dụng yêu cầu:</Text>
              <Text style={styles.identityName}>{request.identity.name || 'External MiniApp'}</Text>
              {request.identity.uri ? (
                <Text style={styles.identityUri}>{request.identity.uri}</Text>
              ) : null}
            </View>

            {/* Network Cluster Status Badges */}
            <View style={styles.clusterRow}>
              <View style={styles.clusterCol}>
                <Text style={styles.clusterLabel}>Mạng ví N.E.D:</Text>
                <View
                  style={[
                    styles.clusterBadge,
                    { backgroundColor: activeNetwork === 'mainnet-beta' ? '#D8FAF7' : '#FFF1A6' },
                  ]}
                >
                  <Text style={styles.clusterBadgeText}>
                    {activeNetwork === 'mainnet-beta' ? 'Mainnet-Beta' : 'Devnet'}
                  </Text>
                </View>
              </View>

              <View style={styles.clusterArrow}>
                <Feather name="arrow-right" size={16} color="#000000" />
              </View>

              <View style={styles.clusterCol}>
                <Text style={styles.clusterLabel}>Mạng MiniApp yêu cầu:</Text>
                <View
                  style={[
                    styles.clusterBadge,
                    { backgroundColor: isClusterMismatch ? '#FFD6E8' : '#D8FAF7' },
                  ]}
                >
                  <Text style={styles.clusterBadgeText}>
                    {request.cluster || activeNetwork}
                  </Text>
                </View>
              </View>
            </View>

            {/* CẢNH BÁO CLUSTER GUARD NẾU SAI LỆCH MÔI TRƯỜNG */}
            {isClusterMismatch ? (
              <View style={styles.clusterGuardAlertCard}>
                <View style={styles.alertHeaderRow}>
                  <Ionicons name="warning" size={20} color="#EF4444" />
                  <Text style={styles.alertTitle}>Bộ Lọc Cluster Guard Đã Chặn ⚠️</Text>
                </View>
                <Text style={styles.alertMsg}>
                  {clusterValidation.error?.message ||
                    'MiniApp gửi yêu cầu tới cụm mạng khác với trạng thái hiện tại của ví N.E.D. Yêu cầu đã bị chặn để bảo vệ tài sản.'}
                </Text>
              </View>
            ) : null}

            {/* Chi Tiết Payload nếu có */}
            {request.type === 'sign_transactions' ||
            request.type === 'sign_and_send_transactions' ? (
              <View style={styles.payloadSummaryCard}>
                <Text style={styles.payloadLabel}>
                  Số lượng giao dịch cần ký:{' '}
                  <Text style={{ fontWeight: '800' }}>
                    {(request as any).payloads?.length || 1} giao dịch
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Nút Hành Động (NeoButton) */}
            <View style={styles.buttonRow}>
              <NeoButton
                title="Từ chối"
                backgroundColor="#FFFFFF"
                onPress={handleReject}
                style={styles.actionBtn}
              />

              {isClusterMismatch ? (
                <NeoButton
                  title="Đổi mạng"
                  backgroundColor="#FFF1A6"
                  onPress={handleGoToSettings}
                  style={styles.actionBtn}
                />
              ) : (
                <NeoButton
                  title="Chấp nhận"
                  backgroundColor="#9E77DC"
                  textStyle={{ color: '#FFFFFF' }}
                  onPress={handleApprove}
                  style={styles.actionBtn}
                />
              )}
            </View>
          </NeoCard>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
  },
  cardContainer: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9E77DC',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 14,
  },
  identityLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  identityName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    marginTop: 2,
  },
  identityUri: {
    fontSize: 11,
    color: '#9E77DC',
    marginTop: 2,
    fontWeight: '600',
  },
  clusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 14,
  },
  clusterCol: {
    flex: 1,
  },
  clusterLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  clusterBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  clusterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  clusterArrow: {
    paddingHorizontal: 8,
  },
  clusterGuardAlertCard: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#EF4444',
    marginBottom: 16,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
  },
  alertMsg: {
    fontSize: 11.5,
    color: '#991B1B',
    lineHeight: 16,
    fontWeight: '500',
  },
  payloadSummaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 14,
  },
  payloadLabel: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
  },
});

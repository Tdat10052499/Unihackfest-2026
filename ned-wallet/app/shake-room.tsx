import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { supabase } from '@/services/supabase';
import { useGlobalPresence } from '@/contexts/GlobalPresenceContext';
import { getSolanaBalance } from '@/services/solana';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Participant {
  user_id: string;
  name: string;
  avatar: string;
  wallet_address?: string;
  isHost: boolean;
  hasPaid: boolean;
}

export default function ShakeRoomScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  let privy: any = null;
  try {
    privy = usePrivy();
  } catch (e) {}
  const user = privy?.user || null;

  let solanaWalletState: any = null;
  try {
    solanaWalletState = useEmbeddedSolanaWallet();
  } catch (e) {}

  const { currentUserProfile } = useGlobalPresence();

  // State phòng & thành viên
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [totalBill, setTotalBill] = useState('200000');
  const [note, setNote] = useState('Ăn trưa nhóm');
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Lấy địa chỉ ví Solana
  const getSolanaAddress = (): string | null => {
    if (!user) return null;
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solAccount = linkedAccounts.find(
      (acc: any) => acc.type === 'wallet' && (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solAccount?.address || null;
  };

  // Pulse animation cho badge LIVE
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Khởi tạo Supabase Realtime Channel cho Room
  useEffect(() => {
    if (!roomId || !user) return;

    const channelName = `shake_room_${roomId}`;
    console.log(`🔌 [Shake Room] Kết nối Realtime channel: ${channelName}`);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const myProfile: Participant = {
      user_id: user.id,
      name: currentUserProfile.name || 'Tôi',
      avatar: currentUserProfile.avatar || 'Đ',
      wallet_address: getSolanaAddress() || undefined,
      isHost: true, // tạm gán, sync sau
      hasPaid: false,
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Participant>();
        const membersList: Participant[] = [];

        Object.keys(state).forEach((key, idx) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const p = presences[presences.length - 1];
            membersList.push({
              ...p,
              isHost: idx === 0,
            });
          }
        });

        // Nếu chưa có ai khác, đảm bảo bản thân hiển thị
        if (membersList.length === 0) {
          membersList.push(myProfile);
        }

        setParticipants(membersList);
      })
      .on('broadcast', { event: 'bill_updated' }, ({ payload }) => {
        console.log('💰 [Shake Room] Bill updated broadcast:', payload);
        if (payload?.totalBill) setTotalBill(payload.totalBill);
        if (payload?.note) setNote(payload.note);
        setIsRequestSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .on('broadcast', { event: 'member_paid' }, ({ payload }) => {
        console.log('✅ [Shake Room] Member paid broadcast:', payload);
        setParticipants((prev) =>
          prev.map((m) => (m.user_id === payload.user_id ? { ...m, hasPaid: true } : m))
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track(myProfile);
        }
      });

    roomChannelRef.current = channel;

    return () => {
      console.log(`🧹 [Shake Room] Rời khỏi channel ${channelName}`);
      if (roomChannelRef.current) {
        supabase.removeChannel(roomChannelRef.current);
        roomChannelRef.current = null;
      }
    };
  }, [roomId, user]);

  // Tính toán số tiền mỗi người
  const parsedTotal = parseFloat(totalBill.replace(/,/g, '')) || 0;
  const count = Math.max(participants.length, 1);
  const amountPerPerson = Math.round(parsedTotal / count);

  // Gửi broadcast cập nhật hóa đơn cho các thành viên
  const handleBroadcastBill = async () => {
    if (!roomChannelRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await roomChannelRef.current.send({
        type: 'broadcast',
        event: 'bill_updated',
        payload: {
          totalBill,
          note,
          amountPerPerson,
        },
      });
      setIsRequestSent(true);
      Alert.alert('Thành công', `Đã đẩy yêu cầu chia tiền ${amountPerPerson.toLocaleString()} đ/người tới tất cả thành viên!`);
    } catch (e) {
      console.error('Lỗi khi gửi broadcast bill:', e);
    }
  };

  // Thanh toán on-chain hoặc xác nhận thanh toán
  const handlePayShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPaying(true);

    // Giả lập giao dịch / hoặc broadcast thành công
    setTimeout(async () => {
      setIsPaying(false);
      setPaymentSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (roomChannelRef.current && user) {
        await roomChannelRef.current.send({
          type: 'broadcast',
          event: 'member_paid',
          payload: {
            user_id: user.id,
            name: currentUserProfile.name,
          },
        });
      }

      Alert.alert('Thành công 🎉', 'Bạn đã thanh toán phần chia tiền thành công!');
    }, 1500);
  };

  const copyRoomId = async () => {
    if (!roomId) return;
    await Clipboard.setStringAsync(roomId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Đã sao chép mã phòng', roomId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Phòng giao dịch ảo</Text>
          <TouchableOpacity
            style={styles.roomIdBadge}
            onPress={copyRoomId}
            activeOpacity={0.7}
          >
            <Text style={styles.roomIdText}>MÃ PHÒNG: #{roomId || 'RADAR'}</Text>
            <Feather name="copy" size={12} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.liveIndicator}>
          <Animated.View
            style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]}
          />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Bill Card */}
        <View style={styles.billCard}>
          <View style={styles.billCardHeader}>
            <MaterialCommunityIcons name="receipt-text-outline" size={22} color="#00A859" />
            <Text style={styles.billCardTitle}>Tổng hóa đơn cần chia</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.billInput}
              value={totalBill}
              onChangeText={setTotalBill}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748B"
            />
            <Text style={styles.currencyLabel}>VND</Text>
          </View>

          <View style={styles.noteContainer}>
            <Feather name="edit-2" size={14} color="#94A3B8" />
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Nội dung chia tiền (VD: Ăn trưa nhóm)"
              placeholderTextColor="#64748B"
            />
          </View>

          {/* Equal Split Summary Box */}
          <View style={styles.splitSummaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Số người tham gia:</Text>
              <Text style={styles.summaryValue}>{count} thành viên</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Mỗi người đóng:</Text>
              <Text style={styles.summaryValueBold}>
                {amountPerPerson.toLocaleString()} đ
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.broadcastBtn}
            onPress={handleBroadcastBill}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
            <Text style={styles.broadcastBtnText}>Cập nhật & Đẩy yêu cầu tới nhóm</Text>
          </TouchableOpacity>
        </View>

        {/* Participants List */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Thành viên trong phòng ({participants.length})
            </Text>
            <Text style={styles.sectionSubtitle}>Phạm vi Geolocation ~20m</Text>
          </View>

          {participants.length === 0 ? (
            <View style={styles.emptyMembersBox}>
              <ActivityIndicator size="small" color="#00A859" />
              <Text style={styles.emptyText}>Đang chờ các thiết bị lân cận kết nối...</Text>
            </View>
          ) : (
            participants.map((m, idx) => (
              <View key={m.user_id || idx} style={styles.memberCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{m.avatar || 'U'}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{m.name || 'Người dùng'}</Text>
                    {m.isHost && (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>Host</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberShare}>
                    Phần chia: {amountPerPerson.toLocaleString()} đ
                  </Text>
                </View>

                {m.hasPaid ? (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#00A859" />
                    <Text style={styles.paidText}>Đã trả</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Chờ TT</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Floating Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.payButton,
            paymentSuccess && styles.payButtonSuccess,
            isPaying && styles.payButtonDisabled,
          ]}
          onPress={handlePayShare}
          disabled={isPaying || paymentSuccess}
          activeOpacity={0.85}
        >
          {isPaying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : paymentSuccess ? (
            <>
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Bạn đã thanh toán!</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>
                Thanh toán {amountPerPerson.toLocaleString()} đ
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  roomIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  roomIdText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  billCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  billCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  billInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: '#00A859',
    padding: 0,
  },
  currencyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: '#F8FAFC',
    padding: 0,
  },
  splitSummaryBox: {
    backgroundColor: 'rgba(0, 168, 89, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 89, 0.25)',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 8,
  },
  summaryLabelBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  summaryValueBold: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00A859',
  },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
  },
  broadcastBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyMembersBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#00A859',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  hostBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EAB308',
  },
  memberShare: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 168, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  paidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00A859',
  },
  pendingBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00A859',
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonSuccess: {
    backgroundColor: '#10B981',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

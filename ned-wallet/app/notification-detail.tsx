import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Linking, Alert, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useNotificationStore, InAppNotification } from '../stores/useNotificationStore';
import { useUserStore } from '../stores/useUserStore';
import { displayNamesFor } from '../services/identity/resolve';
import { Badge, Button, Card, DText, Header, IconButton, InfoRow, Screen, SectionLabel } from '@/components/design';
import { colors, fonts, glass, radius, space } from '@/constants/design';

/**
 * Định dạng số điện thoại hiển thị rõ ràng
 * VD: +84 912 345 678 hoặc 0912 345 678
 */
function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+84') && cleaned.length >= 11) {
    return `+84 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone.trim();
}

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notifications, activeNotification } = useNotificationStore();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tìm thông báo theo id truyền qua param hoặc dùng activeNotification
  const notification: InAppNotification | undefined =
    notifications.find((n) => n.id === id) || activeNotification || undefined;

  // State quản lý thông tin Người chuyển & Người nhận
  const [senderName, setSenderName] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string | null>(null);
  const [senderWallet, setSenderWallet] = useState<string>('');

  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string | null>(null);
  const [recipientWallet, setRecipientWallet] = useState<string>('');

  const [isResolving, setIsResolving] = useState<boolean>(true);

  // Phân giải thông tin Người chuyển & Người nhận (Tên ví, Số điện thoại, Địa chỉ ví)
  useEffect(() => {
    if (!notification) return;

    let isMounted = true;

    async function resolveProfiles() {
      setIsResolving(true);
      const currentUser = useUserStore.getState();
      const myWallet = currentUser.walletAddress || useNotificationStore.getState().activeWalletAddress || '';
      const myUsername = currentUser.username ? `@${currentUser.username}` : 'Your wallet';
      const myPhone = currentUser.linkedPhone || null;

      const isReceive = notification!.type === 'RECEIVE_MONEY';

      // 1. Địa chỉ ví khởi tạo
      const sWallet =
        notification!.senderWallet ||
        (isReceive ? 'Solana wallet' : myWallet || 'Your wallet');

      const rWallet =
        notification!.recipientWallet ||
        (isReceive ? myWallet || 'Your wallet' : 'Recipient wallet on Solana');

      // 2. Tên & SĐT khởi tạo
      let sName = notification!.senderName || '';
      let sPhone = notification!.senderPhone || null;
      let rName = notification!.recipientName || '';
      let rPhone = notification!.recipientPhone || null;

      // Nhận diện nếu ví người chuyển là ví của người dùng hiện tại
      if (myWallet && sWallet === myWallet) {
        sName = sName || myUsername;
        sPhone = sPhone || myPhone;
      } else if (!isReceive && !sName) {
        sName = myUsername;
        sPhone = sPhone || myPhone;
      }

      // Nhận diện nếu ví người nhận là ví của người dùng hiện tại
      if (myWallet && rWallet === myWallet) {
        rName = rName || myUsername;
        rPhone = rPhone || myPhone;
      } else if (isReceive && !rName) {
        rName = myUsername;
        rPhone = rPhone || myPhone;
      }

      // Phục hồi từ sender nếu có
      if (!sName && notification!.sender && notification!.sender !== 'Bạn') {
        sName = notification!.sender;
      }

      // Trích xuất từ senderNote (VD: "Chuyển đến: 0912345678" hoặc "Chuyển đến: @alice.sol")
      if (notification!.senderNote) {
        const matchTo = notification!.senderNote.match(/Chuyển đến:\s*(.+)/i);
        if (matchTo && matchTo[1]) {
          const val = matchTo[1].trim();
          if (val.startsWith('0') || val.startsWith('+84')) {
            if (!rPhone) rPhone = val;
            if (!rName) rName = 'Recipient';
          } else if (!rName) {
            rName = val;
          }
        }
      }

      // Batch ReverseRecord → SNS; never infer another person's clear phone number.
      const names = await displayNamesFor([sWallet, rWallet]);
      sName = names[sWallet] || sName;
      rName = names[rWallet] || rName;
      if (sWallet !== myWallet) sPhone = null;
      if (rWallet !== myWallet) rPhone = null;

      // Fallbacks hiển thị rõ ràng
      if (!sName) {
        sName = isReceive ? 'Solana wallet' : (myUsername || 'Your wallet');
      }
      if (!rName) {
        rName = isReceive ? (myUsername || 'Your wallet') : 'Recipient on Solana';
      }

      if (isMounted) {
        setSenderWallet(sWallet);
        setRecipientWallet(rWallet);
        setSenderName(sName);
        setSenderPhone(sPhone);
        setRecipientName(rName);
        setRecipientPhone(rPhone);
        setIsResolving(false);
      }
    }

    resolveProfiles();

    return () => {
      isMounted = false;
    };
  }, [notification?.id, notification?.txHash]);

  const handleCopy = async (text: string, key: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleOpenSolscan = () => {
    if (!notification?.txHash) {
      Alert.alert('No transaction yet', 'This item has no on-chain transaction hash.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `https://solscan.io/tx/${notification.txHash}?cluster=devnet`;
    Linking.openURL(url).catch((err) => console.warn('Cannot open Solscan URL:', err));
  };

  const handleOpenSolanaExplorer = () => {
    if (!notification?.txHash) {
      Alert.alert('No transaction yet', 'This item has no on-chain transaction hash.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `https://explorer.solana.com/tx/${notification.txHash}?cluster=devnet`;
    Linking.openURL(url).catch((err) => console.warn('Cannot open Solana Explorer URL:', err));
  };

  const handleShare = async () => {
    if (!notification) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isReceive = notification.type === 'RECEIVE_MONEY';
      const content = [
        `[N.E.D Wallet - Transaction details]`,
        `Title: ${notification.title}`,
        notification.amount
          ? `Amount: ${isReceive ? '+' : '-'}$${Number(notification.amount).toFixed(2)} ${notification.currency || 'USDC'}`
          : null,
        `--- From ---`,
        `Name: ${senderName}`,
        senderPhone ? `Phone: ${senderPhone}` : 'Phone: not linked',
        `Wallet: ${senderWallet}`,
        `--- To ---`,
        `Name: ${recipientName}`,
        recipientPhone ? `Phone: ${recipientPhone}` : 'Phone: not linked',
        `Wallet: ${recipientWallet}`,
        notification.txHash ? `TxHash: ${notification.txHash}` : null,
        notification.txHash ? `Solscan: https://solscan.io/tx/${notification.txHash}?cluster=devnet` : null,
      ]
        .filter(Boolean)
        .join('\n');
      await Share.share({ message: content });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (!notification) {
    return (
      <Screen glow="settings">
        <Header title="Notification" onBack={() => router.back()} />
        <View style={styles.emptyCenter}>
          <DText variant="body" align="center">
            We couldn&apos;t find this notification.
          </DText>
          <Button title="Go back" compact onPress={() => router.back()} style={styles.center} />
        </View>
      </Screen>
    );
  }

  const isReceive = notification.type === 'RECEIVE_MONEY';
  const isTransfer = notification.type === 'TRANSFER';
  const isWarning = notification.type === 'WARNING';
  const icon = isReceive
    ? { name: 'arrow-down-left' as const, bg: glass.successFill, fg: colors.successText }
    : isTransfer
      ? { name: 'arrow-up-right' as const, bg: glass.fillStrong, fg: colors.text }
      : isWarning
        ? { name: 'alert-triangle' as const, bg: glass.warningFill, fg: colors.warningText }
        : { name: 'shield' as const, bg: glass.iconTint, fg: colors.purple[300] };

  const formattedDate = new Date(notification.createdAt).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const party = (
    role: 'from' | 'to',
    name: string,
    phone: string | null,
    wallet: string,
    isMine: boolean,
  ) => {
    const key = role === 'from' ? 'sender' : 'recipient';
    return (
      <Card>
        <View style={styles.partyHeaderRow}>
          <DText variant="label">{role === 'from' ? 'From' : 'To'}</DText>
          {isMine ? <Badge label="Your wallet" tone="success" /> : null}
        </View>
        <DText variant="h3" numberOfLines={1} style={styles.partyName}>
          {name || 'Unnamed wallet'}
        </DText>
        <View style={styles.fieldRow}>
          <Feather name="phone" size={14} color={colors.textTertiary} />
          {phone ? (
            <>
              <DText variant="mono" style={styles.fieldValue}>
                {formatDisplayPhone(phone)}
              </DText>
              <CopyButton
                copied={copiedKey === `${key}Phone`}
                label={`Copy ${role === 'from' ? 'sender' : 'recipient'} phone`}
                onPress={() => handleCopy(phone, `${key}Phone`, 'Phone number')}
              />
            </>
          ) : (
            <DText variant="caption" style={styles.fieldValue}>
              No phone linked
            </DText>
          )}
        </View>
        <View style={styles.fieldRow}>
          <Feather name="credit-card" size={14} color={colors.textTertiary} />
          <DText variant="mono" numberOfLines={2} style={[styles.fieldValue, styles.address]}>
            {wallet}
          </DText>
          <CopyButton
            copied={copiedKey === `${key}Wallet`}
            label={`Copy ${role === 'from' ? 'sender' : 'recipient'} wallet address`}
            onPress={() => handleCopy(wallet, `${key}Wallet`, 'Wallet address')}
          />
        </View>
      </Card>
    );
  };

  return (
    <Screen glow="settings">
      <Header
        title="Transaction details"
        onBack={goBack}
        right={<IconButton icon="share-2" accessibilityLabel="Share details" color={colors.text} onPress={handleShare} />}
      />

      <Card variant="accent" style={styles.summary}>
        <View style={[styles.largeIconBox, { backgroundColor: icon.bg }]}>
          <Feather name={icon.name} size={28} color={icon.fg} />
        </View>
        <Badge
          label={isWarning ? 'Network warning' : 'Confirmed on-chain'}
          tone={isWarning ? 'warning' : 'success'}
          icon={isWarning ? 'alert-triangle' : 'check'}
          style={styles.center}
        />
        {notification.amount !== undefined ? (
          <DText variant="hero" align="center" tone={isReceive ? 'success' : 'primary'} style={styles.amount}>
            {isReceive ? '+' : '-'}${Number(notification.amount).toFixed(2)}{' '}
            <DText variant="h3" tone="secondary">
              {notification.currency || 'USDC'}
            </DText>
          </DText>
        ) : null}
        <DText variant="bodyLarge" align="center" style={styles.summaryTitle}>
          {notification.title}
        </DText>
        <DText variant="caption" align="center">
          {formattedDate}
        </DText>
      </Card>

      <SectionLabel>People</SectionLabel>
      <View style={styles.parties}>
        {party('from', senderName, senderPhone, senderWallet, !isReceive)}
        <View style={styles.flowArrow}>
          <Feather name="arrow-down" size={16} color={colors.textSecondary} />
        </View>
        {party('to', recipientName, recipientPhone, recipientWallet, isReceive)}
      </View>

      {(notification.senderNote || notification.message) && (
        <Card style={styles.note}>
          <DText variant="label">Note</DText>
          <DText variant="body" tone="primary" style={styles.noteText}>
            {notification.senderNote || notification.message}
          </DText>
        </Card>
      )}

      <SectionLabel>On-chain</SectionLabel>
      <Card>
        {notification.txHash ? (
          <View style={styles.txRow}>
            <View style={styles.txText}>
              <DText variant="caption" tone="secondary">
                Transaction hash
              </DText>
              <DText variant="mono" numberOfLines={2}>
                {notification.txHash}
              </DText>
            </View>
            <CopyButton
              copied={copiedKey === 'txHash'}
              label="Copy transaction hash"
              onPress={() => handleCopy(notification.txHash!, 'txHash', 'Transaction hash')}
            />
          </View>
        ) : null}
        <InfoRow label="Network" value={notification.network || 'Solana Devnet'} />
        <InfoRow label="Network fee" value={notification.fee || '0.000005 SOL'} mono />
        <InfoRow label="Slot" value={notification.blockNumber ? `#${notification.blockNumber}` : 'Confirmed on-chain'} mono />
        <InfoRow label="Security" value="Max confirmations" valueTone="success" last />
      </Card>

      {notification.txHash ? (
        <View style={styles.actions}>
          <Button title="View on Solscan" icon="external-link" onPress={handleOpenSolscan} />
          <Button title="Solana Explorer" icon="globe" variant="secondary" onPress={handleOpenSolanaExplorer} />
        </View>
      ) : null}
    </Screen>
  );
}

function CopyButton({ copied, label, onPress }: { copied: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.copy} hitSlop={6}>
      <Feather name={copied ? 'check' : 'copy'} size={16} color={copied ? colors.successText : colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignSelf: 'center' },
  emptyCenter: { flex: 1, justifyContent: 'center', gap: space[5] },
  summary: { alignItems: 'center', gap: space[2] },
  largeIconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: space[1],
  },
  amount: { marginTop: space[2] },
  summaryTitle: { fontFamily: fonts.bodySemi },
  parties: { gap: space[2] },
  partyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 22 },
  partyName: { marginTop: space[1], marginBottom: space[2] },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 36 },
  fieldValue: { flex: 1 },
  address: { fontSize: 12 },
  copy: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  flowArrow: {
    alignSelf: 'center',
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: space[3], gap: space[2] },
  noteText: { marginTop: space[1] },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingBottom: space[3], borderBottomWidth: 1, borderColor: glass.divider },
  txText: { flex: 1, gap: 2 },
  actions: { gap: space[3], marginTop: space[5] },
});

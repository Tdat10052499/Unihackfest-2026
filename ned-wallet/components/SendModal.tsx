import React from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SendFlow } from './SendFlow';
interface SendModalProps {
  visible: boolean; onClose(): void; solanaAddress: string | null;
  solBalance?: number | null; availableBalanceUsd?: number | null;
  initialRecipient?: string; onOpenScanner?: () => void;
  onConfirmSend(recipientAddress: string, amountUsd: number): Promise<void | string>;
  isSending?: boolean; needsRecovery?: boolean; onTriggerRecovery?: () => void;
}
export function SendModal(props: SendModalProps) {
  return <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080812' }}>
      {props.visible && <SendFlow wallet={props.solanaAddress} balance={props.availableBalanceUsd} initialRecipient={props.initialRecipient} onClose={props.onClose} onScan={props.onOpenScanner} onSend={props.onConfirmSend} />}
    </SafeAreaView>
  </Modal>;
}

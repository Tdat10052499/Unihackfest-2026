import React from 'react';
import { PhoneManagementModal } from './PhoneManagementModal';
interface Props { visible: boolean; onClose(): void; userId: string; walletAddress: string; onLinkSuccess?: (phone: string) => void }
export function PhoneLinkingModal(props: Props) {
  return <PhoneManagementModal {...props} currentPhone={null} onPhoneUpdated={phone => { if (phone) props.onLinkSuccess?.(phone); }} />;
}

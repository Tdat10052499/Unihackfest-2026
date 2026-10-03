// Text of contract notifications (build-plan B5). Chain data only: the on-chain title, amounts and deadlines.
// Never brief text, milestone names or the content key.
import type { ContractEvent } from './events.ts';
import { formatDeadline, formatUsdc, vndEstimate } from './format.ts';

export function contractNotice(e: ContractEvent, vn: boolean, name: string): { title: string; message: string } {
  const amount = vn ? vndEstimate(e.amountUnits) : formatUsdc(e.amountUnits);
  const job = `“${e.title}”`;
  switch (e.kind) {
    case 'created':
      return { title: `New contract from ${name}`, message: `${job} · ${amount}. Open it to read the brief and accept.` };
    case 'locked':
      return { title: 'Locked · you can start', message: `${name} locked ${amount} for ${job} in the program vault.` };
    case 'submitted':
      return {
        title: `Milestone ${(e.index ?? 0) + 1} submitted`,
        message: `${name} submitted work for ${job}. Review it by ${formatDeadline(e.reviewBy ?? 0)}.`,
      };
    case 'released':
      return {
        title: `Milestone ${(e.index ?? 0) + 1} released`,
        message: e.viaPartner
          ? `${amount} for ${job} was released to the payout partner. VND payout simulated in this demo.`
          : `${amount} for ${job} was released to your N.E.D wallet.`,
      };
  }
}

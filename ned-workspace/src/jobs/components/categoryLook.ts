// Icon, ink and tint per job category (appendix H.1, unchanged in v4 V1), shared by the tiles, cards and filters.
import type { HubIconName } from './HubIcon.tsx';

/** Icon, ink and tint per category index (taxonomy order) */
export const CATEGORY_LOOK: readonly { icon: HubIconName; ink: string; tint: string }[] = [
  { icon: 'design', ink: '#7B2FBE', tint: '#F2EAFB' },
  { icon: 'development', ink: '#C2410C', tint: '#FFE4CF' },
  { icon: 'writing', ink: '#127A3A', tint: '#E7F6EC' },
  { icon: 'marketing', ink: '#B4235A', tint: '#FCE7EF' },
  { icon: 'video', ink: '#3730A3', tint: '#EEEFFE' },
  { icon: 'data', ink: '#0E7490', tint: '#E0F4F8' },
  { icon: 'admin', ink: '#8A5300', tint: '#FFF5E1' },
  { icon: 'other', ink: '#4B4B57', tint: '#EFEFF3' },
];

export const openJobsLabel = (n: number) => (n === 0 ? 'No open jobs yet' : n === 1 ? '1 open job' : `${n} open jobs`);

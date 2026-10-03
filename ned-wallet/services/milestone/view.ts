// Re-export shim (workspace-plan W0): the code lives in packages/ned-core. Keeps old import paths working.
import '../../services/coreInit.ts';
import { FEATURES } from '../../constants/features.ts';
import { toFundView as coreToFundView, type FundAccount, type FundView, type Region, type ViewOptions } from '@ned/core/milestone/view.ts';

export * from '@ned/core/milestone/view.ts';

/** Same as the core's toFundView, with P1 actions shown when FEATURES.dispute is on (as before W0) */
export function toFundView(fund: FundAccount, me: string, region: Region, now: number, opts: ViewOptions = {}): FundView {
  return coreToFundView(fund, me, region, now, { ...opts, p1: opts.p1 ?? FEATURES.dispute });
}

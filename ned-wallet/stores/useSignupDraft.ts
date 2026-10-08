// D30 sign-up draft between the role, country, business and agreement screens. In memory only: nothing is stored
// until "Agree and continue" (services/accountOnboarding.ts commitAgreement).
import { create } from 'zustand';
import { EMPTY_DRAFT, type SignupDraft } from '../services/accountOnboarding';

interface SignupDraftState {
  draft: SignupDraft;
  setDraft: (draft: SignupDraft) => void;
  reset: () => void;
}

export const useSignupDraft = create<SignupDraftState>()((set) => ({
  draft: EMPTY_DRAFT,
  setDraft: (draft) => set({ draft }),
  reset: () => set({ draft: EMPTY_DRAFT }),
}));

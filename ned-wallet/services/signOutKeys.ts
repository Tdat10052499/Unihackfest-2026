// P1 (compliance fix list): signing out never deletes the consent log. Decree 356/2025 Art. 6 asks us to be able to
// show when consent was given or withdrawn, so "@ned_consent_v1" stays on the device; getConsent() already ignores a
// withdrawn or old-version record. Only an explicit "delete all data on this device" action may remove it.
// D30: '@ned_account_v1' holds the agreement log too, so the key stays and storage.ts empties its profiles instead.
export const KEEP_ON_SIGN_OUT = ['@ned_consent_v1', '@ned_account_v1'] as const;

/** The storage keys a sign-out removes: everything except the kept logs */
export function keysToClearOnSignOut(keys: readonly string[]): string[] {
  return keys.filter((k) => !(KEEP_ON_SIGN_OUT as readonly string[]).includes(k));
}

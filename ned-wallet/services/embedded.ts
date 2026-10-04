// Embedded mode (workspace-plan W6, decision D23): the web build runs inside the Workspace's wallet extension, in a
// same-origin iframe. It tells the parent its current route and accepts navigation requests — only from its own
// origin and only from the parent window. Keys, tokens and balances never go through postMessage.
// Web only: React Native has no `document` (and its `window.top` is undefined), so the check stays false on a phone.
export const EMBEDDED = typeof document !== 'undefined' && typeof window !== 'undefined' && window.top !== window.self;

/** Root screens of the bottom navigation: the extension shows no Back button there */
export const ROOT_PATHS = new Set(['/', '/home', '/contracts', '/records', '/settings']);

export type ParentMessage = { type: 'ned-route'; path: string; root: boolean } | { type: 'ned-escape' };
export type ChildMessage = { type: 'ned-navigate'; path: string };

export function postToParent(message: ParentMessage): void {
  if (!EMBEDDED) return;
  window.parent.postMessage(message, window.location.origin);
}

/** A same-origin route path ("/contracts/<fund>"), never a URL to somewhere else */
export const isAppPath = (path: unknown): path is string => typeof path === 'string' && /^\/(?!\/)[\w\-./()[\]]*$/.test(path);

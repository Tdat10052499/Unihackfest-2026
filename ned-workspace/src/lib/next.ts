/** `?next=` after sign-in: only a path on this site ("/jobs/find?q=logo"), never another origin */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

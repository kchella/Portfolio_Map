// ─── src/lib/safeNext.ts ──────────────────────────────────────────────────────
// Sanitises the ?next= redirect target. Only same-origin paths are allowed —
// otherwise ?next=https://evil.com (open redirect) or ?next=javascript:…
// (script execution via window.location.href) would work.

export function safeNext(raw: unknown, fallback = '/map'): string {
  if (typeof raw !== 'string') return fallback
  // Must be a single-slash absolute path; blocks "//evil.com" and "/\evil.com".
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

export const hasMapAccess = (role: string | null | undefined) => role === 'admin' || role === 'user'

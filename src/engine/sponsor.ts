// The "With NAME" mark (SPEC section 5, With NAME). One field on a puzzle, read by this one rule. Pure.
// A field that fails the rule is no sponsor. Nothing here touches a score.

export type Sponsor = {
  name: string;
  /** The sponsor's link, https only. */
  url?: string;
  /** The link as printed on cards and beside the mark: the host, no "www.". */
  host?: string;
};

export const SPONSOR_NAME_MIN = 2;
export const SPONSOR_NAME_MAX = 40;

/** Control and invisible format characters become a space, runs of space become one. */
const tidy = (s: string) => s.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim();

function linkOf(raw: unknown): { url: string; host: string } | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return undefined;
  }
  // A link with a name and password in it shows one site and opens another.
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) return undefined;
  return { url: u.href, host: u.hostname.replace(/^www\./, '') };
}

/** The sponsor on a puzzle's `sponsor` field, or none. A bad link leaves the name with no link. */
export function sponsorOf(raw: unknown): Sponsor | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { name?: unknown; url?: unknown };
  if (typeof r.name !== 'string') return undefined;
  const name = tidy(r.name);
  if (name.length < SPONSOR_NAME_MIN || name.length > SPONSOR_NAME_MAX) return undefined;
  return { name, ...linkOf(r.url) };
}

// Partners (SPEC section 5, Partners): the detectives who work a case beside the player. Pure.
// The first partner is free. Each further one opens at a threshold of lifetime points, which are never spent:
// rank never drops for having a second partner.

/** The partners in the game, in the order they are offered. Ids are stored: never rename or reorder. */
export const PARTNERS = [
  { id: 'cat', name: 'Detective X' },
  { id: 'dino', name: 'Detective Tobs' },
  { id: 'dog', name: 'Detective Puff' },
] as const;
// The robot is drawn (design/characters) and stays out of the game until its name is settled (BUILD_PLAN, Owner).

export type PartnerId = (typeof PARTNERS)[number]['id'];
export const DEFAULT_PARTNER: PartnerId = 'cat';

/** Lifetime points at which a player may hold their 1st, 2nd and 3rd partner. The database holds the same numbers. */
export const PARTNER_POINTS = [0, 3000, 9000] as const;

export type PartnerState = {
  /** The one beside the player now. Always one of `owned`. */
  current: PartnerId;
  /** In the order they were taken. Never empty. */
  owned: PartnerId[];
};

export const START: PartnerState = { current: DEFAULT_PARTNER, owned: [DEFAULT_PARTNER] };

const isPartner = (x: unknown): x is PartnerId => PARTNERS.some((p) => p.id === x);
const whole = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

export const partnerName = (id: PartnerId): string => PARTNERS.find((p) => p.id === id)!.name;

/** How many partners these points allow. At least 1. */
export function slotsFor(points: number): number {
  const p = whole(points);
  return PARTNER_POINTS.filter((n) => p >= n).length;
}

/** A saved state made safe: known partners only, none twice, and the current one among them. Anything else is the start. */
export function parsePartner(raw: unknown): PartnerState {
  if (!raw || typeof raw !== 'object') return START;
  const r = raw as { current?: unknown; owned?: unknown };
  const owned = [...new Set(Array.isArray(r.owned) ? r.owned.filter(isPartner) : [])];
  if (isPartner(r.current) && !owned.includes(r.current)) owned.push(r.current);
  if (!owned.length) return START;
  return { current: isPartner(r.current) ? r.current : owned[0]!, owned };
}

/** `own`: theirs already. `open`: these points allow one more, so it can be taken. `locked`: not yet. */
export function standingOf(state: PartnerState, id: PartnerId, points: number): 'own' | 'open' | 'locked' {
  if (state.owned.includes(id)) return 'own';
  return state.owned.length < slotsFor(points) ? 'open' : 'locked';
}

/** Points at which this player may take one more partner. Null when they hold them all. */
export function nextAt(state: PartnerState): number | null {
  return state.owned.length < PARTNER_POINTS.length ? PARTNER_POINTS[state.owned.length]! : null;
}

/** Switch to a partner, taking it first when the points allow. A locked partner changes nothing. */
export function takePartner(state: PartnerState, id: PartnerId, points: number): PartnerState {
  const how = standingOf(state, id, points);
  if (how === 'locked') return state;
  return { current: id, owned: how === 'own' ? state.owned : [...state.owned, id] };
}

/** The moments a partner shows up in, and the mood each one has. One mood per moment. */
export const MOOD = { hello: 'wave', empty: 'calm', loading: 'thinking', error: 'stumped', done: 'happy', found: 'found', asleep: 'sleepy' } as const;
export type Moment = keyof typeof MOOD;

/**
 * The bond with a partner: cases closed with them beside the player. It changes no score. At each mark the
 * partner is drawn with more of its kit: its magnifying glass at the first, its monocle too at the second.
 */
export const BOND_AT = [3, 10] as const;

/** 0 before the first mark, then 1, then 2. */
export function bondTier(cases: number): number {
  const n = whole(cases);
  return BOND_AT.filter((at) => n >= at).length;
}

/** Cases closed together at which the next mark comes. Null at the last. */
export const nextBondAt = (cases: number): number | null => BOND_AT[bondTier(cases)] ?? null;

/** Cases closed with each partner, made safe: known partners, whole numbers. */
export function parseBonds(raw: unknown): Partial<Record<PartnerId, number>> {
  const out: Partial<Record<PartnerId, number>> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const p of PARTNERS) {
    const n = whole((raw as Record<string, unknown>)[p.id]);
    if (n > 0) out[p.id] = n;
  }
  return out;
}

/** The picture of a partner in a moment, at a bond tier. */
export const partnerSrc = (id: PartnerId, moment: Moment, tier = 0): string => `/partners/${id}-${MOOD[moment]}${tier > 0 ? `-${Math.min(BOND_AT.length, Math.floor(tier))}` : ''}.svg`;
// The first minute (BUILD_PLAN 3b, SPEC section 6). Pure: which step a new player is on, worked out from the
// answers this browser holds and what the account looks like. Nothing here reads storage or the network.
//
// Play first, account later. An account with a profile never sees a step.

/** The steps, in the order they are asked. */
export const STEPS = ['character', 'signin', 'look', 'name'] as const;
export type Step = (typeof STEPS)[number];

/** How a step was left. No entry means it has not been answered. */
export type Answer = 'done' | 'skipped';

/** What the browser remembers about the flow. */
export type Flow = Partial<Record<Step, Answer>> & {
  /** Every step that applies has an answer. A guest who is done is not asked again. */
  done?: boolean;
};

/** What is known about the account, right now. */
export type Account = {
  /** Sign in is set up at all. False: everyone is a guest, for good. */
  enabled: boolean;
  signedIn: boolean;
  /** A profile row exists: this is an existing player. */
  hasProfile: boolean;
};

export const GUEST: Account = { enabled: true, signedIn: false, hasProfile: false };

/** The outfit question's answers. `mixed` is "I'd rather not say": a full answer, the set everyone sees today. */
export const LOOKS = ['feminine', 'masculine', 'mixed'] as const;
export type LookChoice = (typeof LOOKS)[number];

/** The 3 choices, in the order they are shown. The wording was agreed with the owner on 9 Oct 2026. */
export const LOOK_CHOICES: ReadonlyArray<{ value: LookChoice; label: string }> = [
  { value: 'feminine', label: 'A woman' },
  { value: 'masculine', label: 'A man' },
  { value: 'mixed', label: "I'd rather not say" },
];

/** A stored look. Anything that is not one of the 3 reads as no answer. */
export function parseLook(raw: unknown): LookChoice | null {
  return typeof raw === 'string' && (LOOKS as readonly string[]).includes(raw) ? (raw as LookChoice) : null;
}

const isAnswer = (v: unknown): v is Answer => v === 'done' || v === 'skipped';

/** The stored flow. Missing, malformed or half written data reads as no answers: the flow starts over, it never breaks. */
export function parseFlow(raw: unknown): Flow {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: Flow = {};
  for (const s of STEPS) if (isAnswer(r[s])) out[s] = r[s];
  if (r.done === true) out.done = true;
  return out;
}

/** The flow with one step answered. */
export function answer(flow: Flow, step: Step, how: Answer): Flow {
  return { ...parseFlow(flow), [step]: how };
}

/**
 * The steps this player will meet, in order, whatever has been answered so far.
 * Sign in not set up, or skipped: there is no account to name, so the name step is dropped.
 */
export function stepsFor(flow: Flow, account: Account): Step[] {
  const f = parseFlow(flow);
  if (!account.enabled) return ['character', 'look'];
  if (!account.signedIn && f.signin === 'skipped') return ['character', 'signin', 'look'];
  return [...STEPS];
}

/** Whether a step still needs the player. */
function open(step: Step, f: Flow, account: Account): boolean {
  // Signed in is the answer, however it happened (here, at /signin, on a link from an email).
  if (step === 'signin') return !account.signedIn && !f.signin;
  // Asked until the profile exists. A skip that could not be saved is asked again, so nobody is left without a name.
  if (step === 'name') return account.signedIn;
  return !f[step];
}

/**
 * The step to show, or null when there is nothing to ask.
 * - A profile exists: null, always. An existing player never sees the flow, on any device.
 * - A guest who finished or skipped everything: null. They are not asked twice.
 * - Left half way: the first step with no answer, so the flow resumes where it stopped.
 */
export function nextStep(flow: Flow, account: Account): Step | null {
  if (account.hasProfile) return null;
  const f = parseFlow(flow);
  if (f.done && !account.signedIn) return null;
  return stepsFor(f, account).find((s) => open(s, f, account)) ?? null;
}

export type Progress = {
  /** 1 based. 0 when there is no step to show. */
  step: number;
  of: number;
  /** 0 to 1, for the ring: the share of steps already behind the player. It closes when the last one is answered. */
  value: number;
  /** For the ring and screen readers: "Step 2 of 4". */
  label: string;
};

export function progress(flow: Flow, account: Account): Progress {
  const steps = stepsFor(flow, account);
  const at = nextStep(flow, account);
  const of = steps.length;
  if (!at) return { step: 0, of, value: 1, label: 'All steps done' };
  const i = steps.indexOf(at);
  return { step: i + 1, of, value: i / of, label: `Step ${i + 1} of ${of}` };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What a player is called when they skip the name step. Nothing from their email is published without a tap. */
export const NEUTRAL_NAME = 'Reader';

/**
 * A name to prefill, for the player to accept or change: the name the sign in provider gave, else the first run
 * of letters in the email address. Never more than 40 characters. With nothing to go on, the neutral name.
 */
export function suggestName(from: { fullName?: unknown; email?: unknown } | null | undefined): string {
  const full = typeof from?.fullName === 'string' ? from.fullName.replace(/\p{Cc}/gu, '').trim().replace(/\s+/g, ' ') : '';
  if (full) return full.slice(0, 40).trim();
  const local = typeof from?.email === 'string' ? (from.email.split('@')[0] ?? '') : '';
  const word = local.match(/[A-Za-z]{2,}/)?.[0] ?? '';
  return word ? cap(word.toLowerCase()).slice(0, 40) : NEUTRAL_NAME;
}

/** A tail for a handle, from a 0 to 1 random source: 4 characters of a to z and 0 to 9. */
export function tail(random: () => number = Math.random): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 4 }, () => abc[Math.min(abc.length - 1, Math.floor(random() * abc.length))]).join('');
}

/** A handle with a tail, inside the 20 character limit: "ada" becomes "ada_x7k2". */
export function withTail(handle: string, random: () => number = Math.random): string {
  const base = handle.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 15) || NEUTRAL_NAME.toLowerCase();
  return `${base}_${tail(random)}`;
}

/** Where the flow ends: the page the player asked for, else today's daily. Never a menu, never off site. */
export function endOf(next: string | null | undefined, dailyPath: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || next.startsWith('/welcome')) return dailyPath;
  return next;
}

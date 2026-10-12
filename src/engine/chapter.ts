// A written chapter (SPEC section 9, Chapters): a case worked the way a detective works one. One file a chapter
// in `data/chapters`. This is its shape and the rules a chapter must keep to be a fair fight: everybody is met in
// the brief, evidence clears suspects one at a time, nothing names the culprit before the end, and every step
// ends on a lead to the next place. Pure. It reads no file and draws nothing.

export const SHAPES = ['who-did-it', 'prove-it', 'what-is-it-really', 'where-is-it', 'nothing-was-taken'] as const;
export type Shape = (typeof SHAPES)[number];

/** The methods a step can use today. A new method joins this list in the set that builds its engine. */
export const METHODS = ['hidden-words', 'mirror', 'buried-sums', 'unmask', 'line-up'] as const;
export type Method = (typeof METHODS)[number];

export const PROOFS = ['means', 'motive', 'chance'] as const;
export type Proof = (typeof PROOFS)[number];

export type Suspect = {
  /** The role, as the game names a culprit: "the caretaker". One of the `culpritWho` lines. */
  who: string;
  name: string;
  /** Why they are on the board. */
  line: string;
  /** Where they say they were. A suspect may lie, and a step may show it. */
  says: string;
};

export type Step = {
  place: string;
  method: Method;
  /** The real thing in the detective's hands, and why it exists. */
  thing: string;
  /** What the step leaves behind once it is done. */
  fact: string;
  /** The suspect this fact rules out. */
  clears?: string;
  /** Which of the 3 this fact answers. */
  gives?: Proof;
  /** Where the fact sends the detective. Every step but the last has one. */
  lead?: string;
  /** The place of the next step. */
  to?: string;
};

export type Chapter = {
  id: string;
  /** The catalogue case this chapter is told on. */
  case: string;
  shape: Shape;
  title: string;
  item: { name: string; line: string };
  place: string;
  brief: string[];
  suspects: Suspect[];
  culprit: string;
  steps: Step[];
  ending: { found: string; confession: string; after: string };
};

export const SUSPECTS = 4;
export const STEPS_MIN = 5;
export const STEPS_MAX = 7;
/** A line is read on a phone, in one look. */
export const LINE_MAX = 240;

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const has = (line: string, word: string): boolean => word !== '' && line.toLowerCase().includes(word.toLowerCase());

/**
 * Everything wrong with a chapter, in words. Empty means it can be played. `roles` are the characters the game
 * can draw (the `culpritWho` pool). Anything that is not a chapter is one problem, never a throw.
 */
export function checkChapter(raw: unknown, roles: readonly string[]): string[] {
  if (raw == null || typeof raw !== 'object') return ['not a chapter'];
  const c = raw as Partial<Chapter>;
  const out: string[] = [];
  const suspects = Array.isArray(c.suspects) ? c.suspects : [];
  const steps = Array.isArray(c.steps) ? c.steps : [];
  const culprit = suspects.find((s) => s.who === c.culprit);

  if (!text(c.id) || !text(c.case) || !text(c.title) || !text(c.place)) out.push('id, case, title and place are needed');
  if (!SHAPES.includes(c.shape as Shape)) out.push('unknown shape');
  if (!text(c.item?.name) || !text(c.item?.line)) out.push('the item needs a name and a line');
  if (!Array.isArray(c.brief) || c.brief.length === 0) out.push('no brief');

  if (suspects.length !== SUSPECTS) out.push(`${SUSPECTS} suspects are needed`);
  if (new Set(suspects.map((s) => s.who)).size !== suspects.length) out.push('2 suspects share a role');
  for (const s of suspects) {
    if (!roles.includes(s.who)) out.push(`${s.who} is not a character the game can draw`);
    if (!text(s.name) || !text(s.line) || !text(s.says)) out.push(`${s.who} needs a name, a line and a word on where they were`);
  }
  // Nobody new turns up at the end.
  if (!culprit) out.push('the culprit is not one of the suspects');

  if (steps.length < STEPS_MIN || steps.length > STEPS_MAX) out.push(`${STEPS_MIN} to ${STEPS_MAX} steps are needed`);
  const cleared: string[] = [];
  const given: Proof[] = [];
  steps.forEach((s, i) => {
    const last = i === steps.length - 1;
    const at = `step ${i + 1}`;
    if (!METHODS.includes(s.method)) out.push(`${at}: unknown method`);
    if (!text(s.place) || !text(s.thing) || !text(s.fact)) out.push(`${at}: a place, a thing and a fact are needed`);
    if (c.shape === 'who-did-it' && (s.method === 'line-up') !== last) out.push(`${at}: the line-up is the last step, and only the last`);
    if (last) {
      if (s.lead || s.to || s.clears || s.gives) out.push(`${at}: the last step leads nowhere and clears nobody`);
      return;
    }
    // Every step ends on a lead, and the lead is to the next place.
    if (!text(s.lead)) out.push(`${at}: no lead`);
    if (text(s.to) !== text(steps[i + 1]!.place)) out.push(`${at}: its lead does not go to the next step's place`);
    if (s.clears) cleared.push(s.clears);
    if (s.gives) given.push(s.gives);
    if (s.gives && !PROOFS.includes(s.gives)) out.push(`${at}: gives is means, motive or chance`);
    // Evidence clears. It never points at anybody until the end.
    if (culprit && [s.thing, s.fact, text(s.lead)].some((l) => has(l, culprit.who) || has(l, culprit.name))) out.push(`${at}: it names the culprit`);
  });

  for (const s of suspects) {
    const n = cleared.filter((w) => w === s.who).length;
    if (s.who === c.culprit ? n !== 0 : n !== 1) out.push(s.who === c.culprit ? 'the culprit is cleared' : `${s.who} is cleared ${n} times, not once`);
  }
  for (const w of cleared) if (!suspects.some((s) => s.who === w)) out.push(`${w} is cleared and is not a suspect`);
  for (const p of PROOFS) if (given.filter((g) => g === p).length !== 1) out.push(`${p} is given ${given.filter((g) => g === p).length} times, not once`);

  if (!text(c.ending?.found) || !text(c.ending?.confession) || !text(c.ending?.after)) out.push('the ending needs what was found, a confession and what came after');

  // The copy rules, and one look a line.
  const lines = [
    text(c.title), text(c.item?.line), ...(Array.isArray(c.brief) ? c.brief : []),
    ...suspects.flatMap((s) => [s.line, s.says]),
    ...steps.flatMap((s) => [s.thing, s.fact, text(s.lead)]),
    text(c.ending?.found), text(c.ending?.confession), text(c.ending?.after),
  ].map(text);
  for (const l of lines) {
    if (/[—!]/.test(l)) out.push(`an em dash or an exclamation mark: ${l}`);
    if (l.length > LINE_MAX) out.push(`longer than ${LINE_MAX}: ${l}`);
  }
  return out;
}

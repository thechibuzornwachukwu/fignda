// A written chapter (SPEC section 9, Chapters): a case worked the way a detective works one. One file a chapter
// in `stories/`. This is its shape and the rules a chapter must keep to be a fair fight: everybody is met in
// the brief, evidence clears suspects one at a time, nothing names the culprit before the end, and every step
// ends on a lead to the next place. Pure. It reads no file and draws nothing.

export const SHAPES = ['who-did-it', 'prove-it', 'what-is-it-really', 'where-is-it', 'nothing-was-taken'] as const;
export type Shape = (typeof SHAPES)[number];

/** The methods a step can use today. A new method joins this list in the set that builds its engine. */
export const METHODS = ['hidden-words', 'mirror', 'buried-sums', 'unmask', 'line-up'] as const;
export type Method = (typeof METHODS)[number];

export const PROOFS = ['means', 'motive', 'chance'] as const;
export type Proof = (typeof PROOFS)[number];

/** What can be pinned to a case board when it opens. `faces` is the suspects, however many there are. */
export const PIN_KINDS = ['item', 'note', 'left', 'faces', 'map', 'photo', 'alibi'] as const;
export type PinKind = (typeof PIN_KINDS)[number];

export type Pin = {
  kind: PinKind;
  /** The words under a picture. Every kind but a note and the faces has one. */
  label?: string;
  /** A note has a title and a few short lines. */
  title?: string;
  lines?: string[];
};

/** The board as it opens on the brief: nearly empty, and different in every case. */
export type Board = {
  pins: Pin[];
  /** Up to 2 short lines written on the board by hand: "4 near the hall.", "1 of them." */
  scrawl?: string[];
};

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
  /** The fact as a few words, pinned to the board when the step is solved. Every step but the last has one. */
  pin?: string;
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
  board: Board;
  suspects: Suspect[];
  culprit: string;
  steps: Step[];
  ending: { found: string; confession: string; after: string };
};

/** A board holds 1 to 5 suspects. A "who did it" needs somebody to rule out, so 2 at least. */
export const SUSPECTS_MIN = 1;
export const SUSPECTS_MAX = 5;
/** A name sits under a face on the board, on 1 line, 5 across on a phone. */
export const NAME_MAX = 10;
/** An opening board is nearly empty. */
export const PINS_MAX = 5;
/** A pin is a few words on a scrap of paper. */
export const PIN_MAX = 26;
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

  // The opening board: what is pinned on it comes from the chapter, so no 2 cases open alike.
  const opening = Array.isArray(c.board?.pins) ? c.board.pins : [];
  if (opening.length === 0 || opening.length > PINS_MAX) out.push(`the opening board holds 1 to ${PINS_MAX} pins`);
  for (const p of opening) {
    if (!PIN_KINDS.includes(p.kind)) out.push('unknown kind of pin');
    else if (p.kind === 'note' ? !text(p.title) || !Array.isArray(p.lines) || p.lines.length === 0 : p.kind !== 'faces' && !text(p.label)) out.push(`a ${p.kind} pin needs its words`);
    if ([text(p.label), text(p.title), ...(Array.isArray(p.lines) ? p.lines.map(text) : [])].some((l) => l.length > PIN_MAX)) out.push(`a ${p.kind} pin is longer than ${PIN_MAX}`);
  }
  if (opening.filter((p) => p.kind === 'faces').length > 1) out.push('the faces are pinned once');
  const scrawl = Array.isArray(c.board?.scrawl) ? c.board.scrawl : [];
  if (scrawl.length > 2 || scrawl.some((l) => text(l).length > PIN_MAX)) out.push(`the scrawl is 2 lines at most, ${PIN_MAX} letters each`);

  if (suspects.length < SUSPECTS_MIN || suspects.length > SUSPECTS_MAX) out.push(`${SUSPECTS_MIN} to ${SUSPECTS_MAX} suspects are needed`);
  if (c.shape === 'who-did-it' && suspects.length === 1) out.push('a "who did it" needs 2 suspects or more');
  if (new Set(suspects.map((s) => s.who)).size !== suspects.length) out.push('2 suspects share a role');
  for (const s of suspects) {
    if (!roles.includes(s.who)) out.push(`${s.who} is not a character the game can draw`);
    if (!text(s.name) || !text(s.line) || !text(s.says)) out.push(`${s.who} needs a name, a line and a word on where they were`);
    if (text(s.name).length > NAME_MAX) out.push(`${s.name} is longer than ${NAME_MAX} letters`);
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
    if (!text(s.pin) || text(s.pin).length > PIN_MAX) out.push(`${at}: a pin of ${PIN_MAX} letters at most is needed`);
    if (text(s.to) !== text(steps[i + 1]!.place)) out.push(`${at}: its lead does not go to the next step's place`);
    if (s.clears) cleared.push(s.clears);
    if (s.gives) given.push(s.gives);
    if (s.gives && !PROOFS.includes(s.gives)) out.push(`${at}: gives is means, motive or chance`);
    // Evidence clears. It never points at anybody until the end.
    if (culprit && [s.thing, s.fact, text(s.lead), text(s.pin)].some((l) => has(l, culprit.who) || has(l, culprit.name))) out.push(`${at}: it names the culprit`);
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

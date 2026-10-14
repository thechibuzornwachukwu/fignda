// A written chapter (SPEC section 9, Chapters): a case worked the way a detective works one. One file a chapter
// in `design/stories/`. This is its shape and the rules a chapter must keep to be a fair fight: everybody is met in
// the brief, evidence clears suspects one at a time, nothing names the culprit before the end, and every step
// ends on a lead to the next place. Pure. It reads no file and draws nothing.

import { buildHiddenWords, norm } from './hiddenWords';
import { buildMirror } from './mirror';
import { sumsClue } from './sums';

export const SHAPES = ['who-did-it', 'prove-it', 'what-is-it-really', 'where-is-it', 'nothing-was-taken'] as const;
export type Shape = (typeof SHAPES)[number];

/** The methods a step can use today. A new method joins this list in the set that builds its engine. */
export const METHODS = ['hidden-words', 'mirror', 'buried-sums', 'unmask', 'line-up', 'accounts', 'claim', 'trail', 'chain', 'sweep'] as const;
export type Method = (typeof METHODS)[number];

/** The methods a case can close on. A case closes on its last step, and only there. */
export const CLOSERS: readonly Method[] = ['line-up', 'accounts'];

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

/**
 * The seed a suspect's face is drawn from. The cast returns across a casebook, so a face belongs to the person on
 * the street (casebook and role), never to the case: Rosa looks the same in every case she is in.
 */
export const faceSeed = (chapter: { id: string; casebook?: string }, who: string): string => `${chapter.casebook ?? chapter.id}~${who}`;

/** "the stall owner" as the words under a face: "Stall owner". */
export const roleLabel = (who: string): string => {
  const role = who.replace(/^the\s+/i, '');
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export type Suspect = {
  /** The role, as the game names a culprit: "the caretaker". One of the `culpritWho` lines. */
  who: string;
  name: string;
  /** How they are drawn. We wrote them, so we say: a "Mr" is never drawn as a woman. */
  look: 'feminine' | 'masculine';
  /** Why they are on the board. */
  line: string;
  /** Where they say they were. A suspect may lie, and a step may show it. */
  says: string;
};

/**
 * Which account fits (set 1i-d): 1 of 3 tellings of the same night. Exactly 1 stands. Each of the others is
 * struck out by the fact of a step already done, counted from 1, so nothing is weighed that was not found first.
 */
export type Account = { text: string; stands?: boolean; struckBy?: number };

/** How many accounts are weighed. 3: enough that 1 is not simply the other one's opposite. */
export const ACCOUNTS = 3;

/**
 * Could it be done (set 1i-d): a claim set against 2 facts. Each fact comes from a step already done, counted
 * from 1, so nothing is weighed that was not found first. Exactly 1 of them decides whether it could be done.
 */
export type ClaimFact = { text: string; from: number; decides?: boolean };
export type Claim = { says: string; facts: ClaimFact[]; possible: boolean };

/** How many facts a claim is set against. 2: the one that decides, and one that only seems to. */
export const CLAIM_FACTS = 2;

/**
 * The missing step (set 1i-d): events in order with 1 gap, and 3 things that could have happened in it. Exactly
 * 1 fits. `gap` is how many events come before it, so it is never first or last: a gap is in between.
 */
export type Chain = { events: string[]; gap: number; options: Array<{ text: string; fits?: boolean }> };

/** How many events are known, and how many things could fill the gap. */
export const CHAIN_EVENTS = 3;
export const CHAIN_OPTIONS = 3;

/**
 * Sweep the room (set 1i-c): a drawn room, and every thing in it a player can tap. 5 to 7 are evidence, the rest
 * are the room. A box is x, y, width and height on the drawing, which is 1200 by 900.
 */
export type RoomThing = { name: string; box: [number, number, number, number]; evidence?: boolean };
export type Room = { scene: string; things: RoomThing[] };

/** The size every room is drawn at (design/sketches). */
export const SCENE_W = 1200;
export const SCENE_H = 900;
/** How many things in a room are evidence, and how many ordinary things a room has at least, to look past. */
export const SWEEP_MIN = 5;
export const SWEEP_MAX = 7;
export const SWEEP_ROOM_MIN = 6;

export type Step = {
  place: string;
  method: Method;
  /** The real thing in the detective's hands, and why it exists. */
  thing: string;
  /**
   * The evidence itself, on a hidden-words or a blotter step: the text the player searches. A blotter's text is
   * stored as the blotter holds it, back to front.
   */
  text?: string;
  /** The words hidden in `text`. The engine must find every one, and nothing else. */
  words?: string[];
  /** The accounts weighed, on a "which account fits" step. */
  accounts?: Account[];
  /** The claim tested, on a "could it be done" step. */
  claim?: Claim;
  /** The events and the gap, on a "missing step" step. */
  chain?: Chain;
  /** The room searched, on a "sweep the room" step. */
  room?: Room;
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
  /** The casebook it belongs to, and its place in it, counted from 1. */
  casebook?: string;
  number?: number;
  /** Written and checked, but not yet open to players: a method it uses has no screen yet. */
  draft?: boolean;
  shape: Shape;
  title: string;
  /** The question the line-up asks, where nothing was taken: "Who changed the 2 signs?" */
  ask?: string;
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
  // Who the evidence must not name before the end. A "prove it" says who from the brief: its question is how.
  const hidden = c.shape === 'prove-it' ? undefined : culprit;

  if (!text(c.id) || !text(c.title) || !text(c.place)) out.push('id, title and place are needed');
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
    if (s.look !== 'feminine' && s.look !== 'masculine') out.push(`${s.who} needs a look: feminine or masculine`);
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
    if (s.method === 'accounts' || s.accounts != null) {
      const list = Array.isArray(s.accounts) ? s.accounts : [];
      if (s.method !== 'accounts') out.push(`${at}: only a "which account fits" step has accounts`);
      else if (list.length !== ACCOUNTS || list.some((a) => !text(a.text))) out.push(`${at}: ${ACCOUNTS} accounts are needed, each in words`);
      else {
        if (list.filter((a) => a.stands).length !== 1) out.push(`${at}: exactly 1 account stands`);
        // An account is struck out by something already found, never by something still to come.
        for (const a of list) if (!a.stands && !(Number.isInteger(a.struckBy) && a.struckBy! >= 1 && a.struckBy! <= i)) out.push(`${at}: an account that falls is struck by a step before this one`);
        if (list.some((a) => text(a.text).length > LINE_MAX || /[\u2014!]/.test(a.text))) out.push(`${at}: an account breaks the copy rules`);
      }
    }
    if (s.method === 'claim' || s.claim != null) {
      const k = s.claim;
      const facts = Array.isArray(k?.facts) ? k.facts : [];
      if (s.method !== 'claim') out.push(`${at}: only a "could it be done" step has a claim`);
      else if (!text(k?.says) || typeof k?.possible !== 'boolean' || facts.length !== CLAIM_FACTS || facts.some((f) => !text(f.text))) out.push(`${at}: a claim needs what is said, ${CLAIM_FACTS} facts and whether it could be done`);
      else {
        if (facts.filter((f) => f.decides).length !== 1) out.push(`${at}: exactly 1 fact decides`);
        // A claim is set against what is already on the board, never against something still to come.
        if (facts.some((f) => !(Number.isInteger(f.from) && f.from >= 1 && f.from <= i))) out.push(`${at}: a fact comes from a step before this one`);
        if ([k!.says, ...facts.map((f) => f.text)].some((l) => text(l).length > LINE_MAX || /[—!]/.test(l))) out.push(`${at}: a claim breaks the copy rules`);
      }
    }
    if (s.method === 'chain' || s.chain != null) {
      const k = s.chain;
      const events = Array.isArray(k?.events) ? k.events : [];
      const options = Array.isArray(k?.options) ? k.options : [];
      if (s.method !== 'chain') out.push(`${at}: only a "missing step" step has a chain`);
      else if (events.length !== CHAIN_EVENTS || events.some((e) => !text(e)) || options.length !== CHAIN_OPTIONS || options.some((o) => !text(o.text))) out.push(`${at}: a chain needs ${CHAIN_EVENTS} events and ${CHAIN_OPTIONS} things that could fill the gap`);
      else {
        if (!(Number.isInteger(k!.gap) && k!.gap >= 1 && k!.gap < events.length)) out.push(`${at}: the gap is between 2 events`);
        if (options.filter((o) => o.fits).length !== 1) out.push(`${at}: exactly 1 thing fits the gap`);
        if ([...events, ...options.map((o) => o.text)].some((l) => text(l).length > LINE_MAX || /[\u2014!]/.test(l))) out.push(`${at}: a chain breaks the copy rules`);
      }
    }
    if (s.method === 'sweep' || s.room != null) {
      const things = Array.isArray(s.room?.things) ? s.room.things : [];
      const evidence = things.filter((t) => t.evidence).length;
      if (s.method !== 'sweep') out.push(`${at}: only a "sweep the room" step has a room`);
      else if (!text(s.room?.scene) || things.some((t) => !text(t.name))) out.push(`${at}: a room needs its scene and a name for every thing in it`);
      else {
        if (evidence < SWEEP_MIN || evidence > SWEEP_MAX) out.push(`${at}: a room holds ${SWEEP_MIN} to ${SWEEP_MAX} pieces of evidence`);
        if (things.length - evidence < SWEEP_ROOM_MIN) out.push(`${at}: a room has ${SWEEP_ROOM_MIN} ordinary things at least, to look past`);
        const inside = (b: unknown): boolean => {
          if (!Array.isArray(b) || b.length !== 4 || !b.every((v) => typeof v === 'number')) return false;
          const [x, y, w, h] = b as number[];
          return w! > 0 && h! > 0 && x! >= 0 && y! >= 0 && x! + w! <= SCENE_W && y! + h! <= SCENE_H;
        };
        if (things.some((t) => !inside(t.box))) out.push(`${at}: every thing sits inside the drawing`);
        if (new Set(things.map((t) => t.name)).size !== things.length) out.push(`${at}: 2 things in the room share a name`);
      }
    }
    if (s.method === 'trail' && !trailOf({ id: text(c.id), steps }, i + 1)) out.push(`${at}: a trail needs ${TRAIL_MIN} finds or more behind it, each at a place of its own`);
    // Written evidence is checked by the engine that will grade it: every word is there, and no other.
    if (s.text != null || s.words != null) {
      const words = Array.isArray(s.words) ? s.words.map(norm) : [];
      if (s.method !== 'hidden-words' && s.method !== 'mirror') out.push(`${at}: only a hidden-words or a blotter step has a text`);
      else if (!text(s.text) || words.length === 0) out.push(`${at}: a text needs its words`);
      else {
        const found = (s.method === 'mirror' ? buildMirror : buildHiddenWords)({ text: s.text!, dict: words }).answers.map((a) => a.key);
        for (const w of words) if (!found.includes(w)) out.push(`${at}: the engine does not find ${w}`);
        if (hidden && (has(s.text!, hidden.who) || has(s.text!, hidden.name))) out.push(`${at}: it names the culprit`);
      }
    }
    if (c.shape === 'who-did-it' && (s.method === 'line-up') !== last) out.push(`${at}: the line-up is the last step, and only the last`);
    else if (CLOSERS.includes(s.method) !== last) out.push(`${at}: a case closes on its last step, and only there: the line-up or the accounts`);
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
    if (hidden && [s.thing, s.fact, text(s.lead), text(s.pin)].some((l) => has(l, hidden.who) || has(l, hidden.name))) out.push(`${at}: it names the culprit`);
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
    text(c.title), text(c.ask), text(c.item?.line), ...(Array.isArray(c.brief) ? c.brief : []),
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

/** What a step is played on: the engine that grades it, and the text and words it grades. */
export type StepPuzzle = { type: 'hidden-words' | 'mirror' | 'buried-sums'; text: string; dict: string[] };

/**
 * The puzzle of step `n` of a chapter, counted from 1. A hidden-words or a blotter step is its written evidence.
 * A sums step is a row the sums engine makes from the chapter's id and the step's number, so it is the same on
 * every device, and a chapter's 2nd sums step is longer than its 1st. Null for a step that is not played on a
 * board of letters or digits (the line-up), or one whose evidence is not written yet.
 */
export function stepPuzzle(chapter: Pick<Chapter, 'id' | 'steps'>, n: number): StepPuzzle | null {
  const step = chapter.steps[n - 1];
  if (!step) return null;
  if (step.method === 'buried-sums') {
    const earlier = chapter.steps.slice(0, n - 1).filter((s) => s.method === 'buried-sums').length;
    const made = sumsClue(`${chapter.id}~${n}`, earlier);
    return { type: 'buried-sums', text: made.text, dict: [...made.dict] };
  }
  if ((step.method === 'hidden-words' || step.method === 'mirror') && step.text && step.words?.length) return { type: step.method, text: step.text, dict: step.words.map(norm) };
  return null;
}

/** The lead is given, the clearing is earned: a suspect is ruled out by a step finished with this many stars. */
export const CLEAR_STARS = 2;

export type Progress = {
  /** Steps finished, in order from the first. The next one is the step that is open. */
  solved: number;
  /** Suspects ruled out so far, by role. */
  cleared: string[];
  /** Which of means, motive and chance the finished steps gave. */
  given: Proof[];
};

/** Where a player stands, from their best stars on each step (counted from 1). Steps open in order. */
export function chapterProgress(chapter: Pick<Chapter, 'steps'>, stars: Readonly<Record<number, number>>): Progress {
  let solved = 0;
  while (solved < chapter.steps.length && (stars[solved + 1] ?? 0) > 0) solved++;
  const done = chapter.steps.slice(0, solved);
  return {
    solved,
    cleared: done.flatMap((s, i) => (s.clears && (stars[i + 1] ?? 0) >= CLEAR_STARS ? [s.clears] : [])),
    given: done.flatMap((s) => (s.gives ? [s.gives] : [])),
  };
}

/** The line-up: how many wrong names before the mask comes off anyway. Nobody is locked out. */
export const LINEUP_TRIES = 2;

/** Stars for a line-up: 3 for the right name at once, 2 after 1 wrong name, 1 when the tries ran out. */
export const lineupStars = (wrong: number): 1 | 2 | 3 => (wrong <= 0 ? 3 : wrong < LINEUP_TRIES ? 2 : 1);

/** Which account a player should be left with, counted from 0. -1 for a step that weighs none. */
export const accountThatStands = (step: Pick<Step, 'accounts'> | undefined): number => (step?.accounts ?? []).findIndex((a) => a.stands);

/**
 * Stars for a "which account fits" step: 3 for the right account at once, 2 after 1 wrong pick, 1 after 2. With
 * 3 accounts the third pick cannot be wrong, so nobody is locked out.
 */
export const accountStars = (wrong: number): 1 | 2 | 3 => (wrong <= 0 ? 3 : wrong === 1 ? 2 : 1);

/** Stars for a "could it be done" step: 3 for the right verdict at once, 2 after 1 wrong, 1 after 2. */
export const claimStars = (wrong: number): 1 | 2 | 3 => (wrong <= 0 ? 3 : wrong === 1 ? 2 : 1);

/** A verdict on a claim as 1 number, the way it is kept and sent: the fact that decides (0 or 1) twice over, plus 1 for "it could be done". */
export const claimPick = (fact: number, possible: boolean): number => fact * 2 + (possible ? 1 : 0);

/**
 * A step answered by picking, not by searching: which pick is right, out of how many, how many wrong picks are
 * allowed before the answer is shown anyway, and the stars for it. Null for any other step. Picks count from 0.
 */
export type PickStep = { right: number; options: number; tries: number; stars: (wrong: number) => 1 | 2 | 3 };

export function pickStep(step: Pick<Step, 'method' | 'accounts' | 'claim' | 'chain'> | undefined): PickStep | null {
  if (step?.method === 'chain' && step.chain) return { right: step.chain.options.findIndex((o) => o.fits), options: CHAIN_OPTIONS, tries: CHAIN_OPTIONS - 1, stars: accountStars };
  if (step?.method === 'accounts' && step.accounts) return { right: accountThatStands(step), options: ACCOUNTS, tries: ACCOUNTS - 1, stars: accountStars };
  if (step?.method === 'claim' && step.claim) {
    return { right: claimPick(step.claim.facts.findIndex((f) => f.decides), step.claim.possible), options: CLAIM_FACTS * 2, tries: 2, stars: claimStars };
  }
  return null;
}

/**
 * Whether a list of picks could have been played: none twice, none out of range, the right one last when it is
 * there, and otherwise every try spent. The wrong picks before the end, or -1 for a list nobody could have made.
 */
export function pickWrongs(step: PickStep, picks: readonly number[]): number {
  if (picks.length === 0 || picks.length > step.tries || new Set(picks).size !== picks.length) return -1;
  if (picks.some((p) => !Number.isInteger(p) || p < 0 || p >= step.options)) return -1;
  const at = picks.indexOf(step.right);
  if (at >= 0) return at === picks.length - 1 ? at : -1;
  return picks.length === step.tries ? step.tries : -1;
}

/** A trail is walked back over this many finds at least. Fewer is not a walk. */
export const TRAIL_MIN = 3;

/**
 * Walk it back, the trail (set 1i-b): the places of the case are the stops, in the order they were worked, and
 * the finds are handed back out of order to be pinned where each was found. It is made of the chapter itself,
 * so nothing is written for it. `finds` are in the order they are handed out, the same on every device.
 */
export type Trail = { places: string[]; finds: Array<{ pin: string; place: number }> };

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** The trail of step `n`, counted from 1. Null when fewer than 3 finds lie behind it, or 2 share a place. */
export function trailOf(chapter: Pick<Chapter, 'id' | 'steps'>, n: number): Trail | null {
  const stops = chapter.steps.slice(0, Math.max(0, n - 1)).filter((s) => typeof s.pin === 'string' && s.pin.trim() !== '');
  const places = stops.map((s) => s.place);
  if (stops.length < TRAIL_MIN || new Set(places).size !== places.length) return null;
  const order = stops.map((_, i) => i).sort((a, b) => hash(`${chapter.id}~${n}~${a}`) - hash(`${chapter.id}~${n}~${b}`));
  // Handed back in the order they were found, it would be no test: turn the hand by 1.
  if (order.every((v, i) => v === i)) order.push(order.shift()!);
  return { places, finds: order.map((i) => ({ pin: stops[i]!.pin!, place: i })) };
}

/**
 * The finds put in the wrong place, from the places picked for each find in the order they were handed out. A
 * find gets 1 pick: wrong, it is put where it belongs and the next is handed over. -1 for picks nobody could
 * have made.
 */
export function trailWrongs(trail: Trail, picks: readonly number[]): number {
  if (picks.length !== trail.finds.length || picks.some((p) => !Number.isInteger(p) || p < 0 || p >= trail.places.length)) return -1;
  return picks.filter((p, i) => p !== trail.finds[i]!.place).length;
}

/** Stars for a trail: 3 with every find in its place, 2 with 1 misplaced, else 1. Wrong places cost nothing else. */
export const trailStars = (wrong: number): 1 | 2 | 3 => (wrong <= 0 ? 3 : wrong === 1 ? 2 : 1);

/**
 * A sweep, from the things tapped in order (by their place in the room, each once): the evidence found, how much
 * there is, and the taps on things that are only the room. Null for taps nobody could have made.
 */
export function sweepResult(room: Room, picks: readonly number[]): { found: number; total: number; wrongs: number } | null {
  if (new Set(picks).size !== picks.length || picks.some((p) => !Number.isInteger(p) || p < 0 || p >= room.things.length)) return null;
  const found = picks.filter((p) => room.things[p]!.evidence).length;
  return { found, total: room.things.filter((t) => t.evidence).length, wrongs: picks.length - found };
}

/** The quarter of the room a tip-off points at: 0 top left, 1 top right, 2 bottom left, 3 bottom right. Never the thing. */
export const quarterOf = (box: RoomThing['box']): number => (box[1] + box[3] / 2 >= SCENE_H / 2 ? 2 : 0) + (box[0] + box[2] / 2 >= SCENE_W / 2 ? 1 : 0);

/** The tip-off: the quarter of the first piece of evidence not found yet, in the room's own order. -1 when all are found. */
export function sweepHint(room: Room, found: ReadonlySet<number>): number {
  const i = room.things.findIndex((t, k) => t.evidence && !found.has(k));
  return i < 0 ? -1 : quarterOf(room.things[i]!.box);
}


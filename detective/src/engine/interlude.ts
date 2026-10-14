// An interlude (SPEC section 9, Interludes): 1 message to the Open Eye, intercepted between 2 cases. One file
// each in `design/stories/interludes`. It is 1 sitting on 1 hidden-words board, with no suspects and no ending.
// Pure. It reads no file and draws nothing.

import type { Chapter } from './chapter';
import { LINE_MAX } from './chapter';
import { buildHiddenWords, norm } from './hiddenWords';

export type Interlude = {
  id: string;
  casebook: string;
  /** The case it follows, by its number in the casebook. It opens when that case is closed. */
  after: number;
  title: string;
  /** The real thing in the detective's hands, and why it exists. */
  thing: string;
  /** The message, and the words hidden in it. The engine must find every one. */
  text: string;
  words: string[];
  /** What it says, read the way the Open Eye teaches. */
  fact: string;
};

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Everything wrong with an interlude, in words. Empty means it can be played. */
export function checkInterlude(raw: unknown): string[] {
  if (raw == null || typeof raw !== 'object') return ['not an interlude'];
  const i = raw as Partial<Interlude>;
  const out: string[] = [];
  if (!text(i.id) || !text(i.casebook) || !text(i.title)) out.push('id, casebook and title are needed');
  if (!Number.isInteger(i.after) || i.after! < 1) out.push('it follows a case, by number');
  if (!text(i.thing) || !text(i.fact)) out.push('a thing and a fact are needed');
  const words = Array.isArray(i.words) ? i.words.map(norm) : [];
  if (!text(i.text) || words.length === 0) out.push('a text needs its words');
  else {
    const found = buildHiddenWords({ text: i.text!, dict: words }).answers.map((a) => a.key);
    for (const w of words) if (!found.includes(w)) out.push(`the engine does not find ${w}`);
  }
  for (const l of [text(i.title), text(i.thing), text(i.fact)]) {
    if (/[—!]/.test(l)) out.push(`an em dash or an exclamation mark: ${l}`);
    if (l.length > LINE_MAX) out.push(`longer than ${LINE_MAX}: ${l}`);
  }
  return out;
}

/** An interlude as the 1 step chapter it is played as, so a step's board, stars and result are its own. */
export function interludeChapter(i: Interlude): Chapter {
  return {
    id: i.id,
    casebook: i.casebook,
    shape: 'who-did-it',
    title: i.title,
    item: { name: i.title, line: i.thing },
    place: i.title,
    brief: [],
    board: { pins: [] },
    suspects: [],
    culprit: '',
    steps: [{ place: i.title, method: 'hidden-words', thing: i.thing, text: i.text, words: i.words, fact: i.fact }],
    ending: { found: '', confession: '', after: '' },
  };
}

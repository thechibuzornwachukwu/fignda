// The Open Eye file (BUILD_PLAN set 1e): every message to the Open Eye in a casebook, in the order of the story.
// A message is a step marked `eye` in a chapter (a line passed in plain sight, intercepted), or an interlude.
// Pure: it is told which steps a player has done, and reads no storage.

import type { Chapter } from './chapter';
import type { Interlude } from './interlude';

export type EyeEntry = {
  /** Where it is kept: the chapter or interlude id, and the step (an interlude is its own step 1). */
  id: string;
  step: number;
  /** Where it was found: the case it belongs to, or the interlude's own title. */
  from: string;
  place: string;
  /** The message as it was written, and what it says read the Open Eye's way. */
  text: string;
  says: string;
  read: boolean;
};

/**
 * Every message in order: a chapter's messages, then the interludes that follow it. `done` says whether a player
 * has finished a step, by id and step number. A message is read once its step is done.
 */
export function openEyeFile(chapters: readonly Chapter[], interludes: readonly Interlude[], done: (id: string, step: number) => boolean): EyeEntry[] {
  return [...chapters]
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    .flatMap((c) => [
      ...c.steps.flatMap((s, i): EyeEntry[] =>
        s.eye && s.text ? [{ id: c.id, step: i + 1, from: c.title, place: s.place, text: s.text, says: s.fact, read: done(c.id, i + 1) }] : [],
      ),
      ...interludes
        .filter((x) => x.casebook === c.casebook && x.after === c.number)
        .map((x): EyeEntry => ({ id: x.id, step: 1, from: x.title, place: x.title, text: x.text, says: x.fact, read: done(x.id, 1) })),
    ]);
}

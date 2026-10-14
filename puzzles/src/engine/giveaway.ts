// Cheap checks for a paragraph that was written by a machine and hides its words badly.
// The puzzle is turned down before a player sees it. Each finding names the answer or the word at fault.
//
//   plain   A hidden answer that is also a whole word of the text ("rose" hidden in "a pro seed" and "rose" on
//           its own in the next line). The player finds it with no effort, so it is no hiding.
//   repeat  The same hiding trick 3 or more times. The trick is a small whole word swallowed by the answer, with
//           the ends of its neighbours on either side: "a most" hides AMOS, "a mole" hides AMOLE. A whole word
//           that is eaten like that by 3 different answers is one trick used 3 times, and the paragraph reads
//           as if bent to fit.

import type { Answer } from './hiddenWords';
import type { Char } from './text';
import { wordRuns } from './wordRuns';

export const REPEAT_LIMIT = 3;

export type Giveaway =
  | { kind: 'plain'; key: string }
  | { kind: 'repeat'; word: string; keys: string[] };

type Built = { chars: readonly Char[]; answers: readonly Answer[] };

export function giveaways(p: Built): Giveaway[] {
  const runs = wordRuns(p.chars);
  const out: Giveaway[] = [];

  const whole = new Set(runs.map((r) => r.text));
  for (const a of p.answers) if (whole.has(a.key)) out.push({ kind: 'plain', key: a.key });

  // For each answer, the whole words inside its first place that crosses a join.
  const eaten = new Map<string, Set<string>>();
  for (const a of p.answers) {
    const span = a.spans.find(([x, y]) => runs.filter((r) => r.b >= x && r.a <= y).length > 1);
    if (!span) continue;
    for (const r of runs) {
      if (r.a >= span[0] && r.b <= span[1]) {
        const keys = eaten.get(r.text) ?? new Set<string>();
        keys.add(a.key);
        eaten.set(r.text, keys);
      }
    }
  }
  for (const [word, keys] of eaten) if (keys.size >= REPEAT_LIMIT) out.push({ kind: 'repeat', word, keys: [...keys] });

  return out;
}

/** True when the paragraph shows any give-away and should be written again. */
export const readsBadly = (p: Built): boolean => giveaways(p).length > 0;

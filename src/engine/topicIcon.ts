// A topic to its icon, and an emoji typed as a topic to a word. Tables live in `data/`.
// The AI never chooses an icon. No match gives the default, so an icon is never blank and never a wrong guess.

import iconTable from '../../data/topicIcons.json';
import emojiTable from '../../data/topicEmoji.json';

type IconTable = { default: string; icons: ReadonlyArray<{ icon: string; words: readonly string[] }> };
const { default: DEFAULT_ICON, icons: ICONS } = iconTable as IconTable;
const EMOJI = emojiTable as { flag: string; emoji: Record<string, string> };

/** Lucide component name used when nothing matches. */
export const DEFAULT_TOPIC_ICON = DEFAULT_ICON;

/** Lowercase words separated by single spaces. */
const words = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Lucide icon name for a topic. First row in table order that matches wins, not the first word typed. */
export function iconForTopic(topic: string): string {
  const hit = (text: string) => {
    const t = ` ${words(text)} `;
    return ICONS.find((row) => row.words.some((w) => t.includes(` ${w} `) || t.includes(` ${w}s `) || t.includes(` ${w}es `)))?.icon;
  };
  const direct = hit(topic);
  if (direct) return direct;
  const fromEmoji = topicFromEmoji(topic);
  return (fromEmoji && hit(fromEmoji)) || DEFAULT_ICON;
}

const MODIFIERS = /(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0E|\uFE0F|\u20E3)/gu;
const MODIFIER = /^(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0E|\uFE0F|\u20E3)$/u;
const TAGS = /[\u{E0020}-\u{E007F}]/u;
const REGIONAL = /[\u{1F1E6}-\u{1F1FF}]/u;
const PICTO = /\p{Extended_Pictographic}/u;
const ZWJ = '\u200D';

/** Emoji keys carry no variation selector or skin tone. */
const norm = (s: string) => s.replace(MODIFIERS, '');
const TABLE = new Map(Object.entries(EMOJI.emoji).map(([k, v]) => [norm(k), v]));

/** Split into emoji clusters (flag pairs, joined sequences, modified emoji) and the text between them. */
function clusters(input: string): Array<{ text: string; emoji: boolean }> {
  const cps = Array.from(input);
  const out: Array<{ text: string; emoji: boolean }> = [];
  let i = 0;
  while (i < cps.length) {
    const c = cps[i]!;
    if (REGIONAL.test(c)) {
      const pair = REGIONAL.test(cps[i + 1] ?? '') ? 2 : 1;
      out.push({ text: cps.slice(i, i + pair).join(''), emoji: true });
      i += pair;
    } else if (PICTO.test(c)) {
      let j = i + 1;
      for (;;) {
        const n = cps[j];
        if (n && (MODIFIER.test(n) || TAGS.test(n))) j++;
        else if (n === ZWJ && cps[j + 1]) j += 2;
        else break;
      }
      out.push({ text: cps.slice(i, j).join(''), emoji: true });
      i = j;
    } else {
      out.push({ text: c, emoji: false });
      i++;
    }
  }
  return out;
}

/** Most distinct words one run of emoji can add. Ten football emoji is "football", not ten words. */
const MAX_FROM_EMOJI = 3;

/**
 * The topic an input means when it holds emoji, else null.
 * - Words typed beside the emoji win and come first; known emoji add their word after them.
 * - Skin tone and variation selectors are ignored. A flag reads as a country. A joined sequence
 *   (a person cooking) is tried whole, then piece by piece.
 * - Many emoji give at most 3 distinct words.
 * - Null when there is no emoji, or only emoji and none is in the table: the screen asks what it means.
 */
export function topicFromEmoji(input: string): string | null {
  const parts = clusters(String(input ?? ''));
  if (!parts.some((p) => p.emoji)) return null;
  const typed = parts
    .filter((p) => !p.emoji)
    .map((p) => p.text.replace(MODIFIERS, ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  const known: string[] = [];
  for (const p of parts) {
    if (!p.emoji) continue;
    let word: string | undefined;
    if (REGIONAL.test(p.text) || p.text.startsWith('\u{1F3F4}')) word = EMOJI.flag;
    else word = TABLE.get(norm(p.text)) ?? p.text.split(ZWJ).map((x) => TABLE.get(norm(x))).find(Boolean);
    if (word && !known.includes(word)) known.push(word);
  }
  const added = known.slice(0, MAX_FROM_EMOJI);
  if (typed) return [typed, ...added].join(' ');
  return added.length ? added.join(' ') : null;
}

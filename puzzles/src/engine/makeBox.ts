// The one box on /make (BUILD_PLAN set 6c): what was typed decides what the box offers. Pure.
//
//   nothing      "Surprise me": a topic from SURPRISES, picked by the caller's random source
//   a topic      up to 60 letters: the system writes a draft on it
//   emoji        read as a topic (`topicFromEmoji`); emoji we do not know: the box asks what they mean
//   a paragraph  60 letters or more: "Hide some for me" finds words already hidden in it

import iconTable from '../../data/topicIcons.json';
import { MAKE } from './make';
import { topicFromEmoji } from './topicIcon';

/** The longest topic the Worker takes. */
export const TOPIC_MAX = 60;

export type BoxRead =
  | { kind: 'empty' }
  | { kind: 'topic'; topic: string }
  | { kind: 'unknown-emoji' }
  | { kind: 'paragraph'; text: string };

/** The joiner inside an emoji. Written as a number: the character itself cannot be seen in source. */
const ZWJ = String.fromCharCode(0x200d);
/** Control and invisible format characters go; the joiner stays. */
const tidy = (s: string) => s.replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === ZWJ ? c : ' ')).replace(/\s+/g, ' ').trim();

/** What the box holds. A paragraph keeps its line breaks; a topic is one tidy line. */
export function readBox(raw: string): BoxRead {
  const line = tidy(String(raw ?? ''));
  if (!line) return { kind: 'empty' };
  // A topic is under 60 letters, a paragraph 60 or more: the 2 limits meet, so nothing falls between them.
  if (line.length >= MAKE.minText) return { kind: 'paragraph', text: String(raw).trim() };
  const fromEmoji = topicFromEmoji(line);
  if (fromEmoji) return { kind: 'topic', topic: fromEmoji.slice(0, TOPIC_MAX) };
  // Only emoji, and none we know: ask. Letters or digits make it a topic as typed.
  if (!/[\p{L}\p{N}]/u.test(line)) return { kind: 'unknown-emoji' };
  return { kind: 'topic', topic: line };
}

/** Topics "Surprise me" picks from: the first word of each row of the icon table, so each has an icon. */
export const SURPRISES: readonly string[] = (iconTable as { icons: ReadonlyArray<{ words: readonly string[] }> }).icons.map((r) => r.words[0]!).filter(Boolean);

/** One surprise topic. `random` is 0 to 1. */
export const surprise = (random: () => number = Math.random): string => SURPRISES[Math.min(SURPRISES.length - 1, Math.floor(random() * SURPRISES.length))]!;

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MousePointer2, Pointer, type LucideIcon } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Letter } from '../components/Letter';
import type { GameDef } from '../games/catalog';
import { registry } from '../games/registry';
import { useMediaQuery } from '../lib/media';
import styles from './LandingHowTo.module.css';

const mod = registry['hidden-words'];

/** One word in one short line. The engine finds where it is. */
const line = (id: string, text: string, word: string) =>
  mod.build({ id, type: 'hidden-words', category: 'Demo', title: 'Demo', noun: 'words', difficulty: 'Easy', expectedAnswers: [word], dict: [word], text } satisfies GameDef);

/** One beat of a demonstration. */
type Frame = {
  /** The letter of the word the pointer is on, or -1 while it waits to one side. */
  at: number;
  down: boolean;
  /** Letters marked so far, from the first. */
  marked: number;
  found: boolean;
};

const REST: Frame = { at: -1, down: false, marked: 0, found: false };

/** Press on the first letter, slide to the last, let go. */
function dragFrames(n: number): Frame[] {
  const slide = Array.from({ length: n }, (_, i) => ({ at: i, down: true, marked: i + 1, found: false }));
  const done = { at: n - 1, down: false, marked: n, found: true };
  return [REST, { ...REST, at: 0 }, ...slide, done, done, done];
}

/** Tap the first letter, then the last. The whole word shows, then it is checked. */
function tapFrames(n: number): Frame[] {
  const done = { at: n - 1, down: false, marked: n, found: true };
  return [
    REST,
    { ...REST, at: 0 },
    { at: 0, down: true, marked: 1, found: false },
    { at: 0, down: false, marked: 1, found: false },
    { at: n - 1, down: false, marked: 1, found: false },
    { at: n - 1, down: true, marked: n, found: false },
    done,
    done,
    done,
  ];
}

const WAYS = [
  {
    key: 'drag',
    kicker: 'With a mouse',
    text: 'Drag across the letters.',
    icon: MousePointer2,
    /** Where the tip of the icon is, as a share of its box. */
    tip: [0.17, 0.17],
    puzzle: line('how-drag', 'Kamil answered late.', 'Milan'),
    frames: dragFrames,
  },
  {
    key: 'tap',
    kicker: 'With a finger',
    text: 'Tap the first letter, then the last.',
    icon: Pointer,
    tip: [0.33, 0.08],
    puzzle: line('how-tap', 'Walk also slowly.', 'Oslo'),
    frames: tapFrames,
  },
] as const;

/** How long each beat lasts. A pace, not a transition: the moves between beats use the duration tokens. */
const BEAT = 420;

type WayProps = { kicker: string; text: string; icon: LucideIcon; tip: readonly [number, number]; puzzle: ReturnType<typeof line>; frames: (n: number) => Frame[]; still: boolean };

function Way({ kicker, text, icon, tip, puzzle, frames, still }: WayProps) {
  const answer = puzzle.answers[0]!;
  const [first, last] = answer.spans[0]!;
  const seq = frames(last - first + 1);
  const [beat, setBeat] = useState(0);
  // Reduced motion: no loop. The word is shown found, with the pointer on its last letter.
  const frame = still ? seq[seq.length - 1]! : seq[beat % seq.length]!;
  const stage = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLParagraphElement>(null);
  const pointer = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (still) return;
    const t = window.setInterval(() => setBeat((b) => b + 1), BEAT);
    return () => window.clearInterval(t);
  }, [still]);

  // Put the tip of the icon on the letter. Measured, because the line wraps differently at every width.
  useLayoutEffect(() => {
    const place = () => {
      const box = stage.current?.getBoundingClientRect();
      const el = pointer.current;
      const letters = words.current?.children;
      if (!box || !el || !letters) return;
      const of = (li: number) => letters[puzzle.chars.findIndex((c) => c.li === li)]?.getBoundingClientRect();
      const r = of(first + Math.max(0, frame.at));
      if (!r) return;
      const size = el.offsetWidth;
      // Waiting: below and to the left of the first letter, clear of the text.
      const x = frame.at < 0 ? r.left - size : r.left + r.width / 2;
      const y = frame.at < 0 ? r.bottom + size / 2 : r.top + r.height * 0.62;
      el.style.transform = `translate(${x - box.left - size * tip[0]}px, ${y - box.top - size * tip[1]}px)`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [frame, first, puzzle, tip]);

  const marked = (from: number, to: number) => from >= first && to >= from && to < first + frame.marked;

  return (
    <li className={styles.way}>
      <div ref={stage} className={styles.stage} role="img" aria-label={`${text} The hidden word is ${answer.label}.`}>
        <p ref={words} className={styles.words}>
          {puzzle.chars.map((c, i) => (
            <Letter
              key={i}
              ch={c.ch}
              li={-1}
              state={(c.li >= 0 ? marked(c.li, c.li) : marked(c.prev ?? -1, c.next ?? -1)) ? (frame.found ? 'found' : 'selecting') : ''}
              hint={false}
              caret={false}
            />
          ))}
        </p>
        <span ref={pointer} className={styles.pointer} data-down={frame.down || undefined}>
          <Icon icon={icon} size="em" />
        </span>
      </div>
      <p className={styles.caption}>
        <span className={styles.kicker}>{kicker}</span>
        {text}
      </p>
    </li>
  );
}

/** The two ways to pick a word, each shown on a loop: a cursor dragging, a finger tapping. */
export function HowTo() {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  return (
    <ul className={styles.ways}>
      {WAYS.map(({ key, ...way }) => (
        <Way key={key} {...way} still={still} />
      ))}
    </ul>
  );
}

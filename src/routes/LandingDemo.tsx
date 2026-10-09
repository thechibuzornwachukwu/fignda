import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ArrowRight, Pointer } from 'lucide-react';
import * as copy from '../copy';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { TextLink } from '../components/TextLink';
import { WordList, type WordRow } from '../components/WordList';
import type { GameDef } from '../games/catalog';
import { registry } from '../games/registry';
import { applyHint, applyPick, newSession, type Session } from '../games/session';
import { guideSeen, markDemoDone, markGuideSeen } from '../lib/firstMinute';
import { useCoarsePointer, useMediaQuery } from '../lib/media';
import { chime } from '../lib/sound';
import styles from './LandingDemo.module.css';

const TEXT =
  'This line is a most ordinary sentence. Pat omitted nothing. Linda talked for ages, Pedro mentioned very little, and a big old clock kept the time.';

/** Demo words in list order, each with the category it teases. */
const WORDS = [
  { word: 'Atom', lead: 'Science' },
  { word: 'Data', lead: 'AI' },
  { word: 'Rome', lead: 'History' },
  { word: 'Gold', lead: 'General' },
  { word: 'Amos', lead: 'Bible' },
] as const;

const DEF: GameDef = {
  id: 'demo',
  type: 'hidden-words',
  category: 'Demo',
  title: 'Demo',
  noun: 'words',
  difficulty: 'Easy',
  expectedAnswers: WORDS.map((w) => w.word),
  dict: WORDS.map((w) => w.word),
  text: TEXT,
};

const mod = registry[DEF.type];

/** The guide's beats, the same pace as the landing how-to: reach the first letter, tap, move to the last, tap, wait. */
const BEAT = 420;
const TAPS: ReadonlyArray<{ last: boolean; down: boolean }> = [
  { last: false, down: false },
  { last: false, down: true },
  { last: false, down: false },
  { last: true, down: false },
  { last: true, down: true },
  { last: true, down: false },
  { last: true, down: false },
];
/** Where the fingertip is on the Pointer icon, as a share of its box. */
const TIP = [0.33, 0.08] as const;

/**
 * The one guided find (BUILD_PLAN 3b): a hand taps the first letter of a hidden word, then its last, over the
 * real sentence. It only points. The find is the player's own. Reduced motion: it rests on the first letter.
 */
function GuideHand({ stage, first, last }: { stage: RefObject<HTMLDivElement | null>; first: number; last: number }) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [beat, setBeat] = useState(0);
  const frame = still ? TAPS[0]! : TAPS[beat % TAPS.length]!;
  const hand = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (still) return;
    const t = window.setInterval(() => setBeat((b) => b + 1), BEAT);
    return () => window.clearInterval(t);
  }, [still]);

  // Measured, because the sentence wraps differently at every width.
  useLayoutEffect(() => {
    const place = () => {
      const el = hand.current;
      const box = stage.current?.getBoundingClientRect();
      const r = stage.current?.querySelector(`[data-li="${frame.last ? last : first}"]`)?.getBoundingClientRect();
      if (!el || !box || !r) return;
      const size = el.offsetWidth;
      el.style.transform = `translate(${r.left + r.width / 2 - box.left - size * TIP[0]}px, ${r.top + r.height * 0.62 - box.top - size * TIP[1]}px)`;
      el.dataset.placed = 'true';
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [frame, first, last, stage]);

  return (
    <span ref={hand} className={styles.hand} data-down={frame.down || undefined} aria-hidden="true">
      <Icon icon={Pointer} size="em" />
    </span>
  );
}

/**
 * Five words, drag or tap-tap, hint cycles Give me a hint -> Show it -> Play again.
 * `guide`: a first time visitor on a phone gets one guided find, then is alone.
 */
export function LandingDemo({ guide = false }: { guide?: boolean }) {
  const puzzle = useMemo(() => mod.build(DEF), []);
  const answers = mod.answers(puzzle);
  const total = answers.length;
  const [s, setS] = useState<Session>(() => newSession(0));
  const coarse = useCoarsePointer();
  const instructionId = useId();
  const stage = useRef<HTMLDivElement>(null);
  // The first hidden word in reading order, and its first and last letters. No answers: no guide.
  const lead = useMemo(() => [...puzzle.answers].filter((a) => a.spans[0]).sort((a, b) => a.spans[0]![0] - b.spans[0]![0])[0]?.spans[0] ?? null, [puzzle]);
  const [guided, setGuided] = useState(() => !guide || guideSeen());
  const guiding = !guided && !!lead && s.found.length === 0;
  const endGuide = () => {
    if (guided) return;
    markGuideSeen();
    setGuided(true);
  };

  const foundSet = useMemo(() => new Set(s.found.map((f) => f.key)), [s.found]);
  const foundSpans = useMemo(() => s.found.map((f) => f.span), [s.found]);
  const done = s.found.length === total;
  const next = mod.hint(puzzle, foundSet);
  const showing = !!next && s.hintLi === next.at;

  // Copy picks happen here, never inside a state updater (StrictMode runs updaters twice).
  const pick = (a: number, b: number) => {
    const ev = mod.check(puzzle, a, b, foundSet);
    if (ev.kind === 'hit') chime();
    const next = applyPick(s, ev, { now: Date.now(), total, daily: false, copy });
    // The first find ends the guide for good. Finishing makes this a returning visitor.
    if (next.found.length > 0) endGuide();
    if (next.found.length === total) markDemoDone();
    setS(next);
  };

  const onHint = () => {
    if (done) return setS(newSession(0));
    if (!next) return;
    if (!showing) return setS(applyHint(s, next, copy));
    // Second press on the same mark reveals the word.
    const a = puzzle.answers.find((x) => x.key === next.key)!;
    const [x, y] = a.spans[0]!;
    endGuide();
    if (s.found.length + 1 === total) markDemoDone();
    setS({
      ...s,
      found: [...s.found, { key: a.key, label: a.label, span: [x, y] }],
      hintLi: -1,
      msg: copy.pick('reveal', { w: a.label }),
    });
  };

  const rows: WordRow[] = WORDS.map((w) => {
    const key = w.word.toLowerCase();
    return {
      key,
      label: w.word,
      length: key.length,
      lead: w.lead,
      state: foundSet.has(key) ? 'found' : 'hidden',
    };
  });

  return (
    <div className={styles.demo}>
      <div className={styles.main}>
        <p id={instructionId} className={styles.instruction}>
          {guiding
            ? 'A word is hiding where the hand points. Tap its first letter, then its last.'
            : coarse
              ? 'Five words are hidden below. Swipe across the letters, or tap the first and then the last.'
              : 'Five words are hidden below. Drag across the letters to find them.'}
        </p>
        <div ref={stage} className={styles.stage}>
          <mod.Board
            {...mod.boardProps(puzzle)}
            size="hero"
            label="Demo sentence"
            found={foundSpans}
            missed={[]}
            // While the guide runs, the word's first letter wears the hint ring, so it reads without the hand too.
            hintLi={guiding && s.hintLi < 0 ? lead[0] : s.hintLi}
            disabled={false}
            onPick={pick}
            onTapStart={() => setS({ ...s, msg: copy.pick('tapNext') })}
            onDragStart={() => s.msg && setS({ ...s, msg: '' })}
            describedBy={instructionId}
          />
          {guiding && <GuideHand stage={stage} first={lead[0]} last={lead[1]} />}
        </div>
        <div className={styles.actions}>
          <TextLink onClick={onHint}>{done ? 'Play again' : showing ? 'Show it' : 'Give me a hint'}</TextLink>
          {guiding && <TextLink onClick={endGuide}>Skip the guide</TextLink>}
          <span className={styles.msg} role="status">
            {s.msg}
          </span>
        </div>
      </div>
      <WordList
        title="Hidden above"
        count={`${s.found.length} / ${total}`}
        rows={rows}
        footer={
          done && (
            <Button variant="accent" to="/play/nigeria" className={styles.cta}>
              That was the warm up. Now find 26.
              <Icon icon={ArrowRight} size={16} />
            </Button>
          )
        }
      />
    </div>
  );
}

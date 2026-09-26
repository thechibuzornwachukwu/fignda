import { useId, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import * as copy from '../copy';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { TextLink } from '../components/TextLink';
import { WordList, type WordRow } from '../components/WordList';
import type { GameDef } from '../games/catalog';
import { registry } from '../games/registry';
import { applyHint, applyPick, newSession, type Session } from '../games/session';
import { useCoarsePointer } from '../lib/media';
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

/** Five words, drag or tap-tap, hint cycles Give me a hint -> Show it -> Play again. */
export function LandingDemo() {
  const puzzle = useMemo(() => mod.build(DEF), []);
  const answers = mod.answers(puzzle);
  const total = answers.length;
  const [s, setS] = useState<Session>(() => newSession(0));
  const coarse = useCoarsePointer();
  const instructionId = useId();

  const foundSet = useMemo(() => new Set(s.found.map((f) => f.key)), [s.found]);
  const foundSpans = useMemo(() => s.found.map((f) => f.span), [s.found]);
  const done = s.found.length === total;
  const next = mod.hint(puzzle, foundSet);
  const showing = !!next && s.hintLi === next.at;

  // Copy picks happen here, never inside a state updater (StrictMode runs updaters twice).
  const pick = (a: number, b: number) =>
    setS(applyPick(s, mod.check(puzzle, a, b, foundSet), { now: Date.now(), total, daily: false, copy }));

  const onHint = () => {
    if (done) return setS(newSession(0));
    if (!next) return;
    if (!showing) return setS(applyHint(s, next, copy));
    // Second press on the same mark reveals the word.
    const a = puzzle.answers.find((x) => x.key === next.key)!;
    const [x, y] = a.spans[0]!;
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
          {coarse
            ? 'Five words are hidden below. Swipe across the letters, or tap the first and then the last.'
            : 'Five words are hidden below. Drag across the letters to find them.'}
        </p>
        <mod.Board
          {...mod.boardProps(puzzle)}
          size="hero"
          label="Demo sentence"
          found={foundSpans}
          missed={[]}
          hintLi={s.hintLi}
          disabled={false}
          onPick={pick}
          onTapStart={() => setS({ ...s, msg: copy.pick('tapNext') })}
          onDragStart={() => s.msg && setS({ ...s, msg: '' })}
          describedBy={instructionId}
        />
        <div className={styles.actions}>
          <TextLink onClick={onHint}>{done ? 'Play again' : showing ? 'Show it' : 'Give me a hint'}</TextLink>
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

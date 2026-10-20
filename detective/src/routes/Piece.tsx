import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { IconLink } from '../components/IconLink';
import { pieceStars, pieceWrongs, piecesOf, type Chapter } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { useCase } from '../lib/cold';
import { markGuestPlayed, playKey } from '../lib/guestLimit';
import page from './Step.module.css';
import { Onward } from './Onward';
import { Print, PrintDefs } from './PrintArt';
import { Marks } from './StepMarks';
import { wayOn } from './stepWay';
import styles from './Piece.module.css';

/** The print is cut 3 across. */
const COLS = 3;

/**
 * Piece it together (SPEC section 6, Piece it together): marks lifted from the glass come off in pieces. The places
 * on the glass fill in reading order, and the open place takes the next piece tapped. A place gets 1 pick: a wrong
 * piece goes back, the right one is set in, and it costs a star, never the lead. Set whole, the marks are a print.
 */
export function Piece({ chapter, at, solved }: { chapter: Chapter; at: number; solved: number }) {
  const { cold, sid, base } = useCase(chapter.id);
  const step = chapter.steps[at - 1]!;
  const pieces = useMemo(() => piecesOf(chapter, at)!, [chapter, at]);
  const rows = Math.ceil(pieces.count / COLS);
  const auth = useAuth();
  const [best, setBest] = useState<number>(() => loadChapterStars(sid)[at] ?? 0);
  const [done, setDone] = useState(best > 0);
  const [picks, setPicks] = useState<number[]>([]);
  const open = done ? -1 : picks.length;
  // A piece is on the glass once its place is done, whichever piece was picked for it.
  const placed = new Set(done ? pieces.order : pieces.order.slice(0, picks.length));

  const set = (d: number) => {
    if (done || placed.has(d)) return;
    const next = [...picks, d];
    setPicks(next);
    if (next.length < pieces.count) return;
    setBest(recordChapterStars(sid, at, pieceStars(pieceWrongs(pieces, next))));
    setDone(true);
    if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: at, picked: next }, log: { events: [], hints: [], finish: 1 } });
  };

  const again = () => {
    setDone(false);
    setPicks([]);
  };

  return (
    <div className={page.screen} data-step={at} data-piece={done ? 'done' : 'open'} data-finished={done || undefined}>
      <PrintDefs of={pieces.of} />
      <div className={page.top}>
        <IconLink to={base} icon={ArrowLeft} label="The board" />
        <Marks chapter={chapter} at={at} solved={Math.max(solved, done ? at : 0)} />
      </div>
      <h1 className={page.title}>{step.place}</h1>

      {done && (
        <div className={page.end} data-step-end>
          <Stars value={best as 0 | 1 | 2 | 3} size={20} />
          <StepResult chapter={chapter} at={at} stars={best} />
          {step.lead && (
            <p className={page.lead} data-lead>
              {step.lead}
            </p>
          )}
          <Onward to={`${base}/${at + 1}`} label={wayOn(chapter, at)} stars={best} onAgain={again} />
        </div>
      )}

      <ol className={styles.glass} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} aria-label="The glass" data-whole={done || undefined}>
        {pieces.order.map((_, k) => {
          const filled = done || k < picks.length;
          const mended = filled && !done && picks[k] !== pieces.order[k];
          return (
            <li key={k} className={styles.place} data-place={k} data-state={filled ? (mended ? 'mended' : 'set') : k === open ? 'open' : 'ahead'} aria-label={k === open ? 'The next piece goes here' : undefined}>
              {filled && <Print cell={k} cols={COLS} rows={rows} />}
            </li>
          );
        })}
      </ol>

      {!done && (
        <ul className={styles.pile} aria-label="Lifted pieces">
          {pieces.deal.map((cell, d) =>
            placed.has(d) ? null : (
              <li key={d}>
                <button type="button" className={styles.piece} onClick={() => set(d)} data-piece={d} aria-label={`Piece ${d + 1}`}>
                  <Print cell={cell} cols={COLS} rows={rows} />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

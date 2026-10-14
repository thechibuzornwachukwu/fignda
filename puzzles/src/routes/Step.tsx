import { useEffect, useId, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { CaseBoard } from '../components/CaseBoard';
import { GuestWall } from '../components/GuestWall';
import { MobileBar } from '../components/MobileBar';
import { Partner } from '../components/Partner';
import { PartnerNote } from '../components/PartnerNote';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { TextLink } from '../components/TextLink';
import { WordList, type WordRow } from '../components/WordList';
import { pick } from '../copy';
import { chapterProgress, CLEAR_STARS, roleLabel, stepPuzzle, type Chapter, type StepPuzzle } from '../engine/chapter';
import { starsFor } from '../engine/stars';
import { sumsTarget } from '../engine/sums';
import { getChapter } from '../games/chapters';
import { registry } from '../games/registry';
import { useGameSession, type Session } from '../games/session';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { caseClosed, caseWay, useCase, useCold } from '../lib/cold';
import { caseOpen } from '../lib/firstCase';
import { loadFlow } from '../lib/firstMinute';
import { guestBlocked, markGuestPlayed, playKey } from '../lib/guestLimit';
import { markPlayedToday } from '../lib/playDays';
import { Accounts } from './Accounts';
import { Chain } from './Chain';
import { Claim } from './Claim';
import { LineUp } from './LineUp';
import styles from './Step.module.css';
import { Onward } from './Onward';
import { Marks } from './StepMarks';
import { Sweep } from './Sweep';
import { TornPage } from './TornPage';
import { wayOn } from './stepWay';
import { Trail } from './Trail';

/**
 * /case/:id/:n. One step of a written chapter, played on the board its method has. It ends on what was learned
 * and where that leads. Steps open in order, and a finished one can be played again.
 */
export function Step() {
  const { id = '', n = '' } = useParams();
  const chapter = getChapter(id);
  const at = Number(n);
  const step = chapter && Number.isInteger(at) ? chapter.steps[at - 1] : undefined;
  const locked = useMemo(() => pick('stepLocked'), []);
  const soon = useMemo(() => pick('lineupSoon'), []);
  const auth = useAuth();
  const cold = useCold();
  // A guest plays 2 games, and a step is a game. Decided when it opens, so a result is never walled.
  const [blocked] = useState(() => guestBlocked(playKey(id, undefined, Number.isInteger(at) && at > 0 ? at : undefined)));
  if (!chapter) return <Navigate to="/play" replace />;
  // A case opens when the one before it is closed. The brief says so.
  const { sid, base } = caseWay(chapter.id, cold);
  // A cold case is a closed case, worked again.
  if (cold && !caseClosed(chapter)) return <Navigate to={`/case/${chapter.id}`} replace />;
  if (!step || !caseOpen(chapter)) return <Navigate to={base} replace />;

  const progress = chapterProgress(chapter, loadChapterStars(sid));
  if (at > progress.solved + 1)
    return (
      <div className={styles.screen} data-step="locked">
        <PartnerNote moment="empty" layout="screen" title="Not yet">
          <p>{locked}</p>
          <TextLink to={base}>Back to the board</TextLink>
        </PartnerNote>
      </div>
    );

  if (auth.enabled && blocked && !cold) {
    // Still finding out who this is: never wall someone who is signed in.
    if (auth.loading) return <div aria-busy="true" />;
    if (!auth.session) return <GuestWall />;
  }

  if (step.method === 'line-up') return <LineUp chapter={chapter} progress={progress} />;
  if (step.method === 'accounts') return <Accounts chapter={chapter} progress={progress} />;
  if (step.method === 'torn') return <TornPage key={`${chapter.id}~${at}`} chapter={chapter} at={at} solved={progress.solved} />;
  if (step.method === 'sweep') return <Sweep key={`${chapter.id}~${at}`} chapter={chapter} at={at} solved={progress.solved} />;
  if (step.method === 'chain') return <Chain key={`${chapter.id}~${at}`} chapter={chapter} at={at} solved={progress.solved} />;
  if (step.method === 'trail') return <Trail key={`${chapter.id}~${at}`} chapter={chapter} at={at} solved={progress.solved} />;
  if (step.method === 'claim') return <Claim key={`${chapter.id}~${at}`} chapter={chapter} at={at} solved={progress.solved} />;

  const def = stepPuzzle(chapter, at);
  // Evidence that is not written yet: the board as filled, and a line saying so.
  if (!def)
    return (
      <div className={styles.screen} data-step="soon">
        <div className={styles.top}>
          <TextLink to={base}>The board</TextLink>
          <Marks chapter={chapter} at={at} solved={progress.solved} />
        </div>
        <h1 className={styles.title}>{step.place}</h1>
        <CaseBoard chapter={chapter} solved={progress.solved} cleared={progress.cleared} />
        <p className={styles.line}>{soon}</p>
      </div>
    );

  return <Play key={`${chapter.id}~${at}`} chapter={chapter} at={at} def={def} solved={progress.solved} />;
}

/** An interlude is 1 step by itself: its own way back and way on, no marks, and nothing sent. */
export type Alone = { back: string; backLabel: string; on: string; onLabel: string };

export function Play({ chapter, at, def, solved, alone }: { chapter: Chapter; at: number; def: StepPuzzle; solved: number; alone?: Alone }) {
  const step = chapter.steps[at - 1]!;
  const { cold, sid, base } = useCase(chapter.id);
  const name = `${sid}~${at}`;
  const mod = registry[def.type];
  const auth = useAuth();
  const puzzle = useMemo(
    () => mod.build({ id: name, type: def.type, category: chapter.title, title: step.place, noun: 'words', difficulty: 'Easy', expectedAnswers: [], dict: def.dict, text: def.text }),
    [mod, name, def, chapter.title, step.place],
  );
  const total = mod.answers(puzzle).length;
  const [best, setBest] = useState<number>(() => loadChapterStars(sid)[at] ?? 0);
  const g = useGameSession({
    mod,
    puzzle,
    resumeId: name,
    onFinish: (s: Session) => {
      setBest(recordChapterStars(sid, at, starsFor({ finished: true, found: s.found.length, total, hints: s.hints, wrongs: s.wrongs })));
      if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
      markPlayedToday();
    },
  });
  const signedIn = !!auth.session;
  const { endAt, startAt, sent, log } = g.s;
  const markSent = g.markSent;
  // Signed in, a finished step is sent once to be checked and kept on the account. A result opened again was
  // sent when it was earned. A guest keeps theirs in this browser.
  useEffect(() => {
    if (!g.finished || !signedIn || endAt == null || sent || cold || alone) return;
    markSent();
    void submitPlay({ game: { type: 'case', id: chapter.id, step: at }, log: { events: log?.events ?? [], hints: log?.hints ?? [], finish: Math.max(1, endAt - startAt) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.finished, signedIn, endAt, sent]);
  const instructionId = useId();
  // The pet stands beside the line it says, in the mood of the last thing that happened.
  const tally = `${g.s.found.length}|${g.s.wrongs}|${g.s.hints}`;
  const [seen, setSeen] = useState({ tally, found: g.s.found.length, wrongs: g.s.wrongs, hints: g.s.hints, mood: 'empty' as 'empty' | 'found' | 'error' | 'loading' });
  if (seen.tally !== tally) {
    const mood = g.s.found.length > seen.found ? 'found' : g.s.wrongs > seen.wrongs ? 'error' : g.s.hints > seen.hints ? 'loading' : 'empty';
    setSeen({ tally, found: g.s.found.length, wrongs: g.s.wrongs, hints: g.s.hints, mood });
  }
  const pet = <Partner moment={seen.mood} size={32} />;
  // What has been found, newest first, then what is still hidden. After the finish, what was missed.
  const rows = useMemo<WordRow[]>(() => {
    const order = mod.listOrder(puzzle);
    const done = [...g.s.found].reverse().map((f): WordRow => ({ key: f.key, label: f.label, length: f.key.length, state: 'found' }));
    const rest = mod
      .answers(puzzle)
      .filter((a) => !g.foundSet.has(a.key))
      .sort((a, b) => order(a.key) - order(b.key))
      .map((a): WordRow => ({ key: a.key, label: a.label, length: a.length, state: g.finished ? 'missed' : 'hidden' }));
    return done.concat(rest);
  }, [mod, puzzle, g.s.found, g.foundSet, g.finished]);
  const { pathname } = useLocation();
  // Play first: the character and the pet are asked after the first result, not before. Once, until it is answered.
  const [lookAsk] = useState(() => !loadFlow().character);
  const askLook = auth.enabled && !auth.session && lookAsk;
  const lookLine = useMemo(() => pick('guestLook'), []);
  const finished = g.finished;
  const found = useMemo(() => g.s.found.map((f) => f.span), [g.s.found]);
  const missed = useMemo(() => (finished ? mod.missed(puzzle, g.foundSet) : []), [finished, mod, puzzle, g.foundSet]);
  const suspect = chapter.suspects.find((s) => s.who === step.clears);
  const notCleared = useMemo(() => pick('stepNotCleared', { who: suspect ? roleLabel(suspect.who) : '' }), [suspect]);
  const find =
    def.type === 'buried-sums'
      ? `Find ${total} runs that add up to ${sumsTarget(def)}.`
      : def.type === 'mirror'
        ? `Find ${total} words. They read right to left.`
        : `Find ${total} hidden words.`;

  return (
    <div className={styles.screen} data-step={at} data-finished={finished || undefined}>
      <div className={styles.top}>
        <TextLink to={alone?.back ?? base}>{alone?.backLabel ?? 'The board'}</TextLink>
        {!alone && <Marks chapter={chapter} at={at} solved={Math.max(solved, finished ? at : 0)} />}
      </div>
      <h1 className={styles.title}>{step.place}</h1>

      {finished ? (
        <div className={styles.end} data-step-end>
          <Stars value={best as 0 | 1 | 2 | 3} size={20} />
          <StepResult chapter={chapter} at={at} stars={best} />
          {suspect && best < CLEAR_STARS && (
            <p className={styles.line} data-not-cleared>
              {notCleared}
            </p>
          )}
          {step.lead && (
            <p className={styles.lead} data-lead>
              {step.lead}
            </p>
          )}
          <Onward to={alone?.on ?? `${base}/${at + 1}`} label={alone?.onLabel ?? wayOn(chapter, at)} stars={best} onAgain={g.replay} />
          {askLook && (
            <p className={styles.line} data-look-ask>
              {lookLine} <TextLink to={`/welcome?from=${encodeURIComponent(pathname)}`}>Choose your look</TextLink>
            </p>
          )}
        </div>
      ) : (
        <p id={instructionId} className={styles.thing}>
          {step.thing} {find}
        </p>
      )}

      <mod.Board
        {...mod.boardProps(puzzle)}
        found={found}
        missed={missed}
        hintLi={g.s.hintLi}
        disabled={finished}
        onPick={g.pick}
        onTapStart={g.tapStart}
        onDragStart={g.dragStart}
        describedBy={finished ? undefined : instructionId}
        label={step.place}
      />

      {!finished && (
        <div className={styles.actions}>
          {!cold && <TextLink onClick={g.hint}>Ask for a tip-off</TextLink>}
          <TextLink onClick={g.finish}>I'm done</TextLink>
          <span className={styles.count}>
            {g.s.found.length} of {total}
          </span>
        </div>
      )}
      {!finished && (
        <p className={styles.says} aria-hidden="true">
          {pet}
          <span>{g.s.msg}</span>
        </p>
      )}
      <p className={styles.sr} aria-live="polite" role="status">
        {g.s.msg}
      </p>

      <div className={styles.list}>
        <WordList title={def.type === 'buried-sums' ? 'Runs' : 'Words'} count={`${g.s.found.length} of ${total}`} rows={rows} />
      </div>

      {!finished && (
        <MobileBar
          count={`${g.s.found.length} of ${total}`}
          progress={total > 0 ? g.s.found.length / total : 0}
          time={null}
          message={g.s.msg || (def.type === 'buried-sums' ? 'Swipe across digits, or tap first then last' : 'Swipe across letters, or tap first then last')}
          pet={pet}
          onHint={cold ? undefined : g.hint}
          onDone={g.finish}
        />
      )}
    </div>
  );
}

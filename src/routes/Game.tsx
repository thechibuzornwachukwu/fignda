import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UsersRound } from 'lucide-react';
import { BigClock, Elapsed } from '../components/BigClock';
import { Icon } from '../components/Icon';
import { MobileBar } from '../components/MobileBar';
import { ProgressLine } from '../components/ProgressLine';
import { TextLink } from '../components/TextLink';
import { WordList, type WordListHandle, type WordRow } from '../components/WordList';
import { dayNo } from '../engine/daily';
import { getGameDef, type GameDef } from '../games/catalog';
import { dailyInfo } from '../games/daily';
import { registry } from '../games/registry';
import { scoreOf, secondsOf, useGameSession } from '../games/session';
import { fetchCustomGame, mergeGuestDailies, submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCoarsePointer } from '../lib/media';
import { ShareSheet, type ShareGame } from '../components/ShareSheet';
import { SoundToggle } from '../components/SoundToggle';
import { dailyDate } from '../games/daily';
import { sharePath } from '../lib/share';
import * as copy from '../copy';
import { joinRoom, newRoomCode, ROOM_RE, type Peer, type Room } from '../lib/room';
import { Challenge } from './Challenge';
import { RoomBar } from './RoomBar';
import { GameResults } from './GameResults';
import styles from './Game.module.css';

export function GameById() {
  const { id = '' } = useParams();
  const def = getGameDef(id);
  if (!def) return <Navigate to="/play" replace />;
  return <GameScreen key={id} def={def} />;
}

export function DailyGame() {
  const { n = '' } = useParams();
  const num = Number(n);
  // Future days are not out yet. The server decides for real in M6.
  if (!Number.isInteger(num) || num < 1 || num > dayNo()) return <Navigate to="/play" replace />;
  const info = dailyInfo(num);
  if (!info) return <Navigate to="/play" replace />;
  return <GameScreen key={`d${num}`} def={info.def} dailyN={num} />;
}

/** A custom game opened by its share code. */
export function GameByCode() {
  const { code = '' } = useParams();
  const [def, setDef] = useState<GameDef | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetchCustomGame(code).then((g) => {
      if (!alive) return;
      setDef(
        g && {
          id: g.id,
          type: 'hidden-words',
          category: 'Custom',
          title: g.title,
          noun: g.noun,
          difficulty: 'Medium',
          expectedAnswers: [],
          dict: g.dict,
          text: g.text,
        },
      );
    });
    return () => {
      alive = false;
    };
  }, [code]);
  if (def === undefined) return <div className={styles.screen} aria-busy="true" />;
  if (!def) return <Navigate to="/play" replace />;
  return <GameScreen key={def.id} def={def} />;
}

function GameScreen({ def, dailyN }: { def: GameDef; dailyN?: number }) {
  const mod = registry[def.type];
  const puzzle = useMemo(() => mod.build(def), [mod, def]);
  const listRef = useRef<WordListHandle>(null);
  const auth = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = dailyN == null ? (params.get('room') ?? '') : '';
  const inRoom = auth.enabled && ROOM_RE.test(roomCode);
  const roomRef = useRef<Room | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const g = useGameSession({
    mod,
    puzzle,
    dailyN,
    beforeHit: (k) => listRef.current?.capture(k),
    onHit: (a, b) => roomRef.current?.sendFind(a, b),
  });
  const { s, foundSet, total, answers, daily, finished } = g;
  const coarse = useCoarsePointer();
  const instructionId = useId();
  const signedIn = !!auth.profile;
  const [sharing, setSharing] = useState(false);
  const vs = params.get('vs');
  const challenge = auth.enabled && vs && vs !== auth.profile?.handle ? vs : null;

  // Play together: join the room in the link. Finds go out as spans and come back through the engine.
  const gRef = useRef(g);
  useLayoutEffect(() => {
    gRef.current = g;
  });
  const myName = auth.profile?.name;
  useEffect(() => {
    if (!inRoom) return;
    let alive = true;
    const me: Peer = { id: crypto.randomUUID(), name: myName ?? 'A friend' };
    void joinRoom(roomCode, me, {
      onFind: (a, b, from) => gRef.current.teamPick(a, b, from.name),
      onPeers: (p) => alive && setPeers(p),
      onJoin: (who) => {
        gRef.current.say(copy.pick('teamJoined', { name: who.name }));
        roomRef.current?.sendSync(gRef.current.s.found.map((f) => f.span));
      },
    }).then((r) => {
      if (!alive) return r?.leave();
      roomRef.current = r;
    });
    return () => {
      alive = false;
      roomRef.current?.leave();
      roomRef.current = null;
      setPeers([]);
    };
  }, [inRoom, roomCode, myName]);

  // Signed in: send the play log once per finished game. The Worker replays it and stores a verified score.
  // Today's daily only; if that fails for a reason other than "already played", keep it as an unverified merge.
  const sent = useRef<number | null>(null);
  useEffect(() => {
    // Rooms are not ranked: finds by teammates are not yours to score.
    if (!finished || !signedIn || inRoom || s.endAt == null || sent.current === s.startAt) return;
    sent.current = s.startAt;
    const isToday = daily && dailyN === dayNo();
    if (daily && !isToday) {
      mergeGuestDailies().catch(() => {});
      return;
    }
    const log = s.log ?? { events: [], hints: [] };
    void submitPlay({
      game: daily ? { type: 'daily', day_no: dailyN! } : { type: 'game', id: def.id },
      log: { events: log.events, hints: log.hints, finish: Math.max(1, s.endAt - s.startAt) },
    }).then((r) => {
      if (daily && !r.ok && r.status !== 409) mergeGuestDailies().catch(() => {});
    });
  }, [finished, signedIn, inRoom, s.endAt, s.startAt, s.log, daily, dailyN, def.id]);

  const foundCount = s.found.length;
  const count = daily && !finished ? `${foundCount} found` : `${foundCount} / ${total}`;
  const progress = total ? foundCount / total : 0;
  const hideProgress = daily && !finished;

  const foundSpans = useMemo(() => s.found.map((f) => f.span), [s.found]);
  const missed = useMemo(() => (finished ? mod.missed(puzzle, foundSet) : []), [finished, mod, puzzle, foundSet]);

  const rows = useMemo<WordRow[]>(() => {
    const byKey = new Map(answers.map((a) => [a.key, a]));
    const foundRows = [...s.found].reverse().map((f): WordRow => ({
      key: f.key,
      label: f.label,
      length: f.key.length,
      state: 'found',
    }));
    if (daily && !finished) return foundRows;
    const order = mod.listOrder(puzzle);
    const rest = [...byKey.values()]
      .filter((a) => !foundSet.has(a.key))
      .sort((a, b) => order(a.key) - order(b.key))
      .map((a): WordRow => ({ key: a.key, label: a.label, length: a.length, state: finished ? 'missed' : 'hidden' }));
    return foundRows.concat(rest);
  }, [answers, s.found, daily, finished, mod, puzzle, foundSet]);

  const Board = mod.Board;
  const perfect = foundCount === total;
  const resultLine =
    (perfect ? 'Every answer found.' : 'The ones you missed are shaded below.') +
    (daily
      ? (s.misses ? ` ${s.misses} ${s.misses === 1 ? 'wrong pick.' : 'wrong picks.'}` : '') +
        ' Come back tomorrow for a new one.'
      : '');

  return (
    <div className={styles.screen}>
      <div className={styles.top}>
        <div className={styles.meta}>
          <Link to="/play" className={styles.back}>
            <Icon icon={ArrowLeft} size={16} />
            All games
          </Link>
          <span className={styles.metaEnd}>
            <span className={styles.level}>
              {def.category} · {puzzle.difficulty}
            </span>
            {auth.enabled && !daily && !inRoom && !finished && (
              <button type="button" className={styles.together} onClick={() => navigate(`?room=${newRoomCode()}`)}>
                <Icon icon={UsersRound} size={16} />
                Play together
              </button>
            )}
            <SoundToggle />
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{daily ? `Find the hidden ${def.noun}` : `Find ${total} ${def.noun}`}</h1>
          <BigClock startAt={s.startAt} endAt={s.endAt} />
        </div>
      </div>

      {inRoom && <RoomBar code={roomCode} peers={peers} path={sharePath({ id: def.id, code: def.id.startsWith('c-') ? def.id.slice(2).toUpperCase() : undefined })} />}

      {challenge && !inRoom && (
        <Challenge
          vs={challenge}
          game={daily ? { day: dailyN! } : { id: def.id }}
          mine={finished ? scoreOf(s, total, daily, secondsOf(s, s.endAt!)) : null}
        />
      )}

      <div className={styles.progress}>
        <div className={styles.stats}>
          <span className={styles.count}>{count}</span>
          <span>{s.hints === 1 ? '1 hint' : `${s.hints} hints`}</span>
        </div>
        {!hideProgress && <ProgressLine value={progress} label="Found" />}
      </div>

      {finished && (
        <GameResults
          title={s.resultTitle ?? ''}
          line={resultLine}
          score={scoreOf(s, total, daily, secondsOf(s, s.endAt!))}
          found={foundCount}
          total={total}
          secs={secondsOf(s, s.endAt!)}
          canReplay={!daily}
          onReplay={g.replay}
          onShare={() => setSharing(true)}
          boardPath={auth.enabled ? (daily ? `/leaderboard?day=${dailyN}` : getGameDef(def.id) ? `/leaderboard/${def.id}` : undefined) : undefined}
          guest={!signedIn}
        />
      )}

      <div className={styles.columns}>
        <div className={styles.main}>
          <p id={instructionId} className={styles.instruction}>
            {coarse
              ? 'Swipe across the letters. Or tap the first letter of a word, then the last.'
              : 'Drag across the letters. Answers can run across spaces and punctuation.'}
          </p>
          <Board
            {...mod.boardProps(puzzle)}
            found={foundSpans}
            missed={missed}
            hintLi={s.hintLi}
            disabled={finished}
            onPick={g.pick}
            onTapStart={g.tapStart}
            onDragStart={g.dragStart}
            describedBy={instructionId}
          />
          {!finished && (
            <div className={styles.actions}>
              <TextLink onClick={g.hint}>Give me a hint</TextLink>
              <TextLink onClick={g.finish}>I'm done</TextLink>
              <span className={styles.msg} aria-hidden="true">
                {s.msg}
              </span>
            </div>
          )}
          <div className={styles.sr} aria-live="polite" role="status">
            {s.msg}
          </div>
        </div>

        <WordList
          ref={listRef}
          title={finished ? 'Answers' : 'Hidden above'}
          count={count}
          rows={rows}
          moreHiding={daily && !finished}
        />
      </div>

      {finished && (
        <ShareSheet
          open={sharing}
          onClose={() => setSharing(false)}
          game={{ ...shareGame(def, puzzle.difficulty, dailyN), vs: auth.profile?.handle }}
          result={{
            answers: puzzle.answers.map((a) => {
              const f = s.found.find((x) => x.key === a.key);
              return { key: a.key, span: f?.span ?? a.spans[0]!, found: !!f, hinted: s.hinted.includes(a.key) };
            }),
            secs: secondsOf(s, s.endAt!),
            score: scoreOf(s, total, daily, secondsOf(s, s.endAt!)),
            hints: s.hints,
          }}
          player={{ name: auth.profile?.name, handle: auth.profile?.handle }}
        />
      )}

      {!finished && (
        <MobileBar
          count={count}
          progress={hideProgress ? 0 : progress}
          time={<Elapsed startAt={s.startAt} endAt={s.endAt} />}
          message={s.msg || (coarse ? 'Swipe across letters, or tap first then last' : 'Drag across the letters')}
          onHint={g.hint}
          onDone={g.finish}
        />
      )}
    </div>
  );
}

/** What the share sheet needs to know about this game. */
function shareGame(def: GameDef, difficulty: string, dailyN?: number): ShareGame {
  const code = def.id.startsWith('c-') ? def.id.slice(2).toUpperCase() : undefined;
  return {
    id: def.id,
    title: def.title,
    noun: def.noun,
    category: def.category,
    difficulty,
    text: def.text,
    daily: dailyN ? { n: dailyN, date: dailyDate(dailyN) } : undefined,
    path: sharePath({ id: def.id, daily: dailyN, code }),
  };
}

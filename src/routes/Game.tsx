import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UsersRound } from 'lucide-react';
import { BigClock, Elapsed } from '../components/BigClock';
import { Icon } from '../components/Icon';
import { MobileBar } from '../components/MobileBar';
import { Ring } from '../components/Ring';
import { TextLink } from '../components/TextLink';
import { WordList, type WordListHandle, type WordRow } from '../components/WordList';
import { dayNo } from '../engine/daily';
import { dailyPool, getGameDef, getPassage, getPuzzle, sponsorFor, type GameDef, type Part } from '../games/catalog';
import { dailyInfo, dailyLabel } from '../games/daily';
import { registry } from '../games/registry';
import { dayHidLine, playFacts, rareLine, recordLines, skillLines, starsUpLine, todayHoldsLine } from '../games/resultLines';
import { isCleanRead, scoreOf, secondsOf, useGameSession, type Session } from '../games/session';
import { CaseClosed, CasePiece } from '../components/CaseFile';
import { clueId } from '../engine/journey';
import { caseFile, doneClues } from '../games/caseFile';
import { starsFor } from '../engine/stars';
import { dayProfile } from '../engine/variableDay';
import { countEvent, fetchCustomGame, fetchDailyPlace, fetchWordStats, mergeGuestDailies, submitPlay } from '../lib/api';
import { guestAsk, markRunTold, runTold } from '../lib/guestAsk';
import { rarestFound } from '../lib/wordStats';
import { useAuth } from '../lib/auth';
import { useCoarsePointer } from '../lib/media';
import { ShareSheet, type ShareGame } from '../components/ShareSheet';
import { SoundToggle } from '../components/SoundToggle';
import { dailyDate } from '../games/daily';
import { copyText, sharePath, shareUrl } from '../lib/share';
import { readPast } from '../engine/reveal';
import { shareText, storyMarks } from '../engine/shareText';
import * as copy from '../copy';
import { joinRoom, newRoomCode, ROOM_RE, type Peer, type Room, type RoomStats, type RoomStatus } from '../lib/room';
import { Challenge } from './Challenge';
import { RoomBar } from './RoomBar';
import { ReminderAsk } from './ReminderAsk';
import { RatePuzzle } from './RatePuzzle';
import { recordPlay } from '../lib/records';
import { markFinished } from '../lib/shelves';
import { record as recordSound } from '../lib/sound';
import { recordStars } from '../lib/starStore';
import { streakPool } from '../lib/streak';
import { useStreak } from '../lib/useStreak';
import { GameResults } from './GameResults';
import { GameReveal } from './GameReveal';
import styles from './Game.module.css';

export function GameById() {
  const { id = '' } = useParams();
  const def = getGameDef(id);
  if (!def) return <Navigate to="/play" replace />;
  return <GameScreen key={id} def={def} />;
}

/** One sitting of a catalogue puzzle: `/play/bible/2`. A puzzle that is not cut, or has no such passage, opens whole. */
export function PassageById() {
  const { id = '', n = '' } = useParams();
  if (!getGameDef(id)) return <Navigate to="/play" replace />;
  const p = /^\d+$/.test(n) ? getPassage(id, Number(n)) : undefined;
  if (!p) return <Navigate to={`/play/${id}`} replace />;
  return <GameScreen key={`${id}~${p.part.n}`} def={p.def} part={p.part} />;
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

/** A daily says how many are left only from here down. */
const NEAR = 3;

function GameScreen({ def, dailyN, part }: { def: GameDef; dailyN?: number; /** A sitting: `def` is the puzzle with one passage as its text. */ part?: Part }) {
  const mod = registry[def.type];
  const puzzle = useMemo(() => mod.build(def), [mod, def]);
  const listRef = useRef<WordListHandle>(null);
  const auth = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // What this browser keeps this game under: stars and the kept game. A sitting is its own game.
  const gameKey = clueId(def.id, part?.n ?? 0);
  const roomCode = dailyN == null && !part ? (params.get('room') ?? '') : '';
  const inRoom = auth.enabled && ROOM_RE.test(roomCode);
  const roomRef = useRef<Room | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('connecting');
  const [roomId] = useState(() => crypto.randomUUID());
  const g = useGameSession({
    mod,
    puzzle,
    dailyN,
    // Leaving keeps the game. A room game is kept under its room, so a dropped connection or a reload loses
    // nothing and your finds stay yours; its clock is the team's and runs on.
    resumeId: dailyN != null ? undefined : inRoom ? `room-${roomCode}-${def.id}` : gameKey,
    sharedClock: inRoom,
    beforeHit: (k) => listRef.current?.capture(k),
    onHit: (a, b) => roomRef.current?.sendFind(a, b),
    onStart: () => countEvent(def.id, 'start'),
    onFinish: (fs) => onFinish(fs),
  });
  const { s, foundSet, total, answers, daily, finished } = g;
  const coarse = useCoarsePointer();
  const instructionId = useId();
  const signedIn = !!auth.profile;
  const [sharing, setSharing] = useState(false);
  const vs = params.get('vs');
  const challenge = auth.enabled && !part && vs && vs !== auth.profile?.handle ? vs : null;

  // Your line on the room scoreboard: your own finds (not teammates'), seconds per word, hints.
  const myFinds = s.found.filter((f) => !f.by).length;
  const pace = myFinds && s.lastFindAt ? Math.round((s.lastFindAt - s.startAt) / 1000 / myFinds) : 0;
  const myStats = useMemo<RoomStats>(() => ({ finds: myFinds, hints: s.hints, pace }), [myFinds, s.hints, pace]);
  const statsRef = useRef(myStats);
  useEffect(() => {
    statsRef.current = myStats;
    roomRef.current?.setStats(myStats);
  }, [myStats]);

  // Play together: join the room in the link. Finds go out as spans and come back through the engine.
  const gRef = useRef(g);
  useLayoutEffect(() => {
    gRef.current = g;
  });
  const myName = auth.profile?.name;
  const myHandle = auth.profile?.handle;
  useEffect(() => {
    if (!inRoom) return;
    let alive = true;
    const syncOut = () => {
      const spans = gRef.current.s.found.map((f) => f.span);
      if (spans.length) roomRef.current?.sendSync(spans);
    };
    const me: Peer = { id: roomId, name: myName ?? 'A friend', handle: myHandle };
    void joinRoom(roomCode, me, {
      onFind: (a, b, from) => gRef.current.teamPick(a, b, from.name),
      onPeers: (p) => alive && setPeers(p),
      onJoin: (who) => {
        gRef.current.say(copy.pick('teamJoined', { name: who.name }));
        syncOut();
      },
      onAsk: syncOut,
      onStatus: (st) => alive && setRoomStatus(st),
    }).then((r) => {
      if (!alive) return r?.leave();
      roomRef.current = r;
      r?.setStats(statsRef.current);
    });
    // Phones drop the connection in the background (sharing the invite in WhatsApp does it). Coming back asks
    // everyone for their finds, and every few seconds each player resends theirs, so boards always converge.
    const back = () => {
      const hidden = document.visibilityState === 'hidden';
      roomRef.current?.setAway(hidden);
      if (!hidden) roomRef.current?.ask();
    };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('online', back);
    const resend = window.setInterval(syncOut, 8000);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', back);
      window.removeEventListener('online', back);
      window.clearInterval(resend);
      roomRef.current?.leave();
      roomRef.current = null;
      setPeers([]);
    };
  }, [inRoom, roomCode, roomId, myName, myHandle]);

  // Signed in: send the play log once per finished game. The Worker replays it and stores a verified score.
  // Today's daily only; if that fails for a reason other than "already played", keep it as an unverified merge.
  const sent = useRef<number | null>(null);
  // Set once the server has answered for this play, so the word stats can include it.
  const [answered, setAnswered] = useState(false);
  useEffect(() => {
    // A sitting is never sent: the server ranks whole puzzles, and a passage is not one.
    if (part || !finished || !signedIn || s.endAt == null || sent.current === s.startAt) return;
    // A result opened again was sent when it was earned. The daily is asked again on purpose: the server
    // answers "already played", and that answer is what lets the word stats load.
    if (!daily && s.sent) return;
    sent.current = s.startAt;
    if (!daily) gRef.current.markSent();
    const isToday = daily && dailyN === dayNo();
    if (daily && !isToday) {
      mergeGuestDailies().catch(() => {});
      return;
    }
    const log = s.log ?? { events: [], hints: [] };
    void submitPlay({
      game: daily ? { type: 'daily', day_no: dailyN! } : { type: 'game', id: def.id },
      log: { events: log.events, hints: log.hints, finish: Math.max(1, s.endAt - s.startAt) },
      // In a room the log holds only your own picks. The server replays it for the Together board and never
      // for the solo boards: a teammate's find is not yours to score.
      ...(inRoom ? { room: roomCode } : {}),
    }).then((r) => {
      if (daily && !r.ok && r.status !== 409) mergeGuestDailies().catch(() => {});
      setAnswered(true);
    });
  }, [part, finished, signedIn, inRoom, roomCode, s.endAt, s.startAt, s.log, s.sent, daily, dailyN, def.id]);

  const foundCount = s.found.length;
  const count = daily && !finished ? `${foundCount} found` : `${foundCount} / ${total}`;
  const progress = total ? foundCount / total : 0;
  // A daily hides its count. With 3 or fewer left, and at least 1 found, it says how many and the ring shows the gap.
  const left = total - foundCount;
  const near = daily && !finished && foundCount > 0 && left > 0 && left <= NEAR;
  const leftLine = useMemo(() => (near ? copy.pick('leftCount', { n: left }) : ''), [near, left]);
  const hideProgress = daily && !finished && !near;

  // Pack shelves: a catalogue puzzle played to the end with at least 1 find is finished in this browser.
  const inCatalogue = !daily && !part && !!getGameDef(def.id);
  useEffect(() => {
    if (finished && inCatalogue && foundCount > 0) markFinished(def.id);
  }, [finished, inCatalogue, foundCount, def.id]);

  // The moment a game ends, once: stars for a catalogue puzzle played alone, then personal records.
  // Both live in this browser. A finished daily opened again does not come through here.
  const starred = (inCatalogue || !!part) && !inRoom;
  const [end, setEnd] = useState<{ at: number; starsUp: boolean; records: string[] } | null>(null);
  function onFinish(fs: Session) {
    // Counted for everyone, guests too: a game played to the end is one with at least 1 word found.
    if (fs.found.length > 0) countEvent(def.id, 'end');
    if (total > 0 && fs.found.length === total) countEvent(def.id, 'full');
    const mine = fs.found.filter((f) => !f.by);
    const cleanRead = isCleanRead(fs, total);
    const stars = starsFor({ finished: true, found: fs.found.length, total, hints: fs.hints, wrongs: fs.wrongs, byOthers: mine.length !== fs.found.length });
    const starsUp = starred && recordStars(gameKey, stars);
    const broke = recordPlay({
      pack: daily || inCatalogue ? def.category : null,
      // A sitting is a few words: its time is no record for the pack.
      cleanSecs: cleanRead && !part ? secondsOf(fs, fs.endAt ?? Date.now()) : null,
      dailyFound: daily ? mine.length : null,
      longest: playFacts(puzzle, fs.found, fs.wrongs, fs.hints).longest,
    });
    if (broke.length) recordSound();
    setEnd({ at: fs.startAt, starsUp, records: recordLines(broke, copy.pick) });
  }
  const ended = end && end.at === s.startAt ? end : null;

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

  // The text result: paste it in a chat. Phones open the share sheet (WhatsApp is one tap), desktops copy.
  const sendText = async (): Promise<string> => {
    const secs = secondsOf(s, s.endAt ?? Date.now());
    const base = shareGame(def, puzzle.difficulty, dailyN, part).path;
    const text = shareText({
      title: def.title,
      daily: dailyN,
      found: s.found.length,
      total,
      secs,
      score: scoreOf(s, total, daily, secs),
      marks: storyMarks(s.log?.events ?? [], s.log?.hints ?? [], s.found.filter((f) => !f.by).map((f) => f.span)),
      url: shareUrl(auth.profile && !part ? `${base}?vs=${auth.profile.handle}` : base),
    });
    if (coarse && navigator.share) {
      try {
        await navigator.share({ text });
        countEvent(def.id, 'share');
        return '';
      } catch {
        /* closed the sheet: fall back to copying */
      }
    }
    if (!(await copyText(text))) return 'Could not copy. Use Share.';
    countEvent(def.id, 'share');
    return 'Copied. Paste it in your group.';
  };

  // After today's daily: where the run stands. Picked once per finish.
  const isToday = daily && dailyN === dayNo();
  const run = useStreak(finished ? s.endAt : 0);
  const streakLine = useMemo(() => {
    const p = isToday && finished ? streakPool(run.streak, run.best) : null;
    return p ? copy.pick(p.pool, { n: p.n }) : '';
  }, [isToday, finished, run.streak, run.best]);
  // Skill lines, 2 at most, rarest first. Picked once per finish.
  const lines = useMemo(
    () => (finished ? skillLines(playFacts(puzzle, s.found, s.wrongs, s.hints), copy.pick) : []),
    // A finished game does not change: its start time names it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finished, puzzle, s.startAt],
  );
  // Stars: a catalogue puzzle played alone. One line beside them when this play raised them.
  const stars = finished && starred
    ? starsFor({ finished, found: foundCount, total, hints: s.hints, wrongs: s.wrongs, byOthers: s.found.some((f) => f.by) })
    : 0;
  const starsUp = !!ended?.starsUp;
  const starLine = useMemo(() => starsUpLine(stars, starsUp, copy.pick), [stars, starsUp]);
  // The case this clue belongs to: a passage gives a piece of the secret, the whole puzzle closes the case.
  // A game with stars is a clue done, the same rule the path reads by.
  const caseNode = useMemo(() => {
    if (!finished || !starred) return null;
    const file = caseFile(def.id, new Set([...doneClues(), gameKey]));
    if (!file) return null;
    if (!part) return <CaseClosed id={def.id} secret={file.word} />;
    const piece = file.piece(part.n);
    return <CasePiece slots={file.slots} fresh={piece.slots} piece={piece.text} />;
  }, [finished, starred, def.id, gameKey, part]);
  // Variable days. Before today's daily: what it holds, never how much. After it: today against a usual day.
  const holdsLine = useMemo(
    () => (isToday && !finished ? todayHoldsLine(dayProfile(puzzle), copy.pick) : ''),
    [isToday, finished, puzzle],
  );
  const dayLine = useMemo(() => {
    if (!isToday || !finished) return '';
    const pool = dailyPool.map((id) => (id === def.id ? puzzle : getPuzzle(id))).filter((p) => p != null);
    return dayHidLine(puzzle, pool, copy.pick);
  }, [isToday, finished, puzzle, def.id]);

  // What you missed, shown where it hides, and how many of them your own picks ran across. Picked once.
  const reveal = useMemo(() => (finished ? mod.reveal(puzzle, foundSet) : []), [finished, mod, puzzle, foundSet]);
  const past = finished ? readPast(s.log?.events ?? [], reveal.map((r) => r.span)) : 0;
  const pastLine = useMemo(() => (past ? copy.pick('readPast', { n: past }) : ''), [past]);
  const doneLine = useMemo(() => (isToday && finished ? copy.pick('doneToday') : ''), [isToday, finished]);

  // "Only 8% found Habakkuk": the rarest word you found on this daily, from 5 verified players up. Picked once.
  // Guests and past days send nothing, so there is nothing to wait for.
  const settled = finished && (!signedIn || !isToday || answered);
  const [rare, setRare] = useState('');
  useEffect(() => {
    if (!daily || !settled || !auth.enabled) return;
    let alive = true;
    fetchWordStats(dailyN!)
      .then((stats) => {
        const r = rarestFound(stats, gRef.current.s.found.map((f) => f.key));
        const label = r && gRef.current.s.found.find((f) => f.key === r.key)?.label;
        const line = rareLine(r, label, copy.pick);
        if (alive && line) setRare(line);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [daily, settled, dailyN, auth.enabled]);

  // A guest after today's daily: where their score would stand, or, once, where their run lives. Picked once.
  const guestToday = isToday && finished && !signedIn && auth.enabled;
  const [place, setPlace] = useState<{ place: number; players: number } | null>(null);
  useEffect(() => {
    if (!guestToday) return;
    let alive = true;
    const cur = gRef.current.s;
    const secs = secondsOf(cur, cur.endAt ?? Date.now());
    fetchDailyPlace(dailyN!, scoreOf(cur, gRef.current.total, true, secs), secs)
      .then((p) => alive && setPlace(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [guestToday, dailyN]);
  const [toldBefore] = useState(runTold);
  const ask = useMemo(() => (guestToday ? guestAsk({ today: true, streak: run.streak, runTold: toldBefore, place }) : null), [guestToday, run.streak, toldBefore, place]);
  const guestLine = useMemo(() => (ask ? copy.pick(ask.pool, ask.vars) : ''), [ask]);
  useEffect(() => {
    // Said once: the next result goes back to the place.
    if (ask?.run) markRunTold();
  }, [ask]);

  // A sponsored puzzle says who it is with on the result and the share card. Picked once.
  const sponsor = useMemo(() => {
    const w = sponsorFor(def);
    return w ? { line: copy.pick('sponsorWith', { name: w.name }), url: w.url, host: w.host } : undefined;
  }, [def]);

  const Board = mod.Board;
  const perfect = foundCount === total;
  const holiday = dailyN != null && dailyLabel(dailyN) !== 'Daily' ? dailyLabel(dailyN) : '';
  const resultLine =
    (holiday ? `${holiday}. ` : '') +
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
              {holiday ? `${holiday} · ` : ''}
              {def.category} · {part ? `Clue ${part.n} of ${part.count + 1}` : puzzle.difficulty}
            </span>
            {auth.enabled && !daily && !part && !inRoom && !finished && (
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
        {holdsLine && <p className={styles.holds}>{holdsLine}</p>}
      </div>

      {inRoom && <RoomBar gameId={def.id} code={roomCode} peers={peers} status={roomStatus} me={myStats} you={{ id: roomId, handle: myHandle }} path={sharePath({ id: def.id, code: def.id.startsWith('c-') ? def.id.slice(2).toUpperCase() : undefined })} />}

      {challenge && !inRoom && (
        <Challenge
          vs={challenge}
          game={daily ? { day: dailyN! } : { id: def.id }}
          mine={finished ? scoreOf(s, total, daily, secondsOf(s, s.endAt!)) : null}
        />
      )}

      <div className={styles.progress}>
        <div className={styles.stats}>
          <span className={styles.tally}>
            {!hideProgress && <Ring value={progress} label="Found" />}
            <span className={styles.count}>{count}</span>
          </span>
          {leftLine && <span className={styles.left}>{leftLine}</span>}
          <span>{s.hints === 1 ? '1 hint' : `${s.hints} hints`}</span>
        </div>
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
          onText={sendText}
          next={part && (part.n < part.count ? { to: `/play/${def.id}/${part.n + 1}`, label: 'Next clue' } : { to: `/play/${def.id}`, label: 'The unmasking' })}
          boardPath={part ? undefined : auth.enabled ? (daily ? `/leaderboard?day=${dailyN}` : getGameDef(def.id) ? `/leaderboard/${def.id}${inRoom ? '?board=together' : ''}` : undefined) : undefined}
          guest={!signedIn}
          guestLine={guestLine}
          streak={streakLine}
          rare={rare}
          caseFile={caseNode}
          stars={stars}
          starsUp={starLine}
          skills={lines}
          records={ended?.records}
          day={dayLine}
          done={doneLine}
          sponsor={sponsor && { ...sponsor, onVisit: () => countEvent(def.id, 'click') }}
        >
          <GameReveal items={reveal} past={pastLine} />
          {isToday && signedIn && <ReminderAsk />}
          {auth.enabled && def.id.startsWith('c-') && <RatePuzzle code={def.id.slice(2).toUpperCase()} />}
        </GameResults>
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
          onShared={() => countEvent(def.id, 'share')}
          game={{ ...shareGame(def, puzzle.difficulty, dailyN, part), vs: part ? undefined : auth.profile?.handle, sponsor }}
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
          progress={hideProgress ? null : progress}
          left={leftLine}
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
function shareGame(def: GameDef, difficulty: string, dailyN?: number, part?: Part): ShareGame {
  const code = def.id.startsWith('c-') ? def.id.slice(2).toUpperCase() : undefined;
  return {
    id: def.id,
    title: def.title,
    noun: def.noun,
    category: def.category,
    difficulty,
    text: def.text,
    daily: dailyN ? { n: dailyN, date: dailyDate(dailyN) } : undefined,
    path: part ? `/play/${def.id}/${part.n}` : sharePath({ id: def.id, daily: dailyN, code }),
  };
}

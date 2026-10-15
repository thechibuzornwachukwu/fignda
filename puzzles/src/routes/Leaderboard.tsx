import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronsUp } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { formatTime } from '../engine/time';
import { getGameDef } from '../games/catalog';
import { fetchGameBoard, fetchMyLeague, fetchTogetherBoard, joinLeague, leaveLeague, type BoardRow, type MyRank, type TeamRow } from '../lib/api';
import { goesUp, tierName, type League } from '../lib/league';
import { TextLink } from '../components/TextLink';
import { nextClueTo } from '../games/path';
import { games } from '../games/catalog';
import { PageHeader } from '../components/PageHeader';
import { PartnerNote } from '../components/PartnerNote';
import { SkeletonList } from '../components/Skeleton';
import { Segmented } from '../components/Segmented';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import styles from './Leaderboard.module.css';


function Board({ rows, me, myHandle, empty, emptyTitle }: { rows: BoardRow[]; me: MyRank | null; myHandle?: string; empty: ReactNode; emptyTitle: string }) {
  if (rows.length === 0) {
    return (
      <PartnerNote layout="screen" title={emptyTitle} className={styles.empty}>
        <p>{empty}</p>
      </PartnerNote>
    );
  }
  const meInTop = !!myHandle && rows.some((r) => r.handle === myHandle);
  const row = (r: BoardRow, mine: boolean, apart = false) => (
    <li key={`${r.rank}-${r.handle}`} className={styles.row} data-mine={mine || undefined} data-apart={apart || undefined}>
      <span className={styles.rank}>{String(r.rank).padStart(2, '0')}</span>
      <Link to={`/u/${r.handle}`} className={styles.handle}>
        <Avatar handle={r.handle} size={28} />
        @{r.handle}
        {mine && <span className={styles.you}>You</span>}
      </Link>
      <span className={styles.found}>{r.total == null ? `${r.found} found` : `${r.found}/${r.total}`}</span>
      <span className={styles.time}>{formatTime(r.secs)}</span>
      <span className={styles.score}>{r.score.toLocaleString('en-US')}</span>
    </li>
  );
  return (
    <>
      <ol className={styles.board} aria-label="Top scores">
        {rows.map((r) => row(r, r.handle === myHandle))}
        {/* Your own row is pinned: it holds to the edge of the screen while the board scrolls past. Below the top, it is set apart. */}
        {me && !meInTop && row(me, true, true)}
      </ol>
      {me && Number.isFinite(me.rank) && Number.isFinite(me.players) && (
        <p className={styles.meta}>
          You are #{me.rank} of {me.players}.
        </p>
      )}
    </>
  );
}

/** The case the player is on: the puzzle of the next clue on the path, or the first one. */
function openPuzzle(): string | null {
  const to = nextClueTo();
  return to?.split('/')[2] ?? games[0]?.id ?? null;
}

/** The board of the case the player is on: the best verified play per player on its whole puzzle. It is what Ranks is. */
function CaseRanks({ myHandle }: { myHandle?: string }) {
  const id = useMemo(() => openPuzzle(), []);
  const g = id ? getGameDef(id) : undefined;
  const [state, setState] = useState<{ id: string; rows: BoardRow[] | 'error' } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchGameBoard(id)
      .then((rows) => alive && setState({ id, rows: Array.isArray(rows) ? rows : [] }))
      .catch(() => alive && setState({ id, rows: 'error' }));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!id || !g) return null;
  const rows = state?.id === id ? state.rows : null;
  return (
    <section className={styles.section} aria-labelledby="case-title" data-case-ranks={id}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 id="case-title" className={styles.h2}>
            {g.title}
          </h2>
        </div>
        <Button to={`/play/${id}`} variant="secondary" size="sm">
          Play it
        </Button>
      </div>
      {rows == null && <SkeletonList rows={5} avatar={28} />}
      {rows === 'error' && (
        <PartnerNote moment="error" layout="screen" className={styles.empty}>
          <p>The board did not load. Try again in a moment.</p>
        </PartnerNote>
      )}
      {Array.isArray(rows) && <Board rows={rows} me={null} myHandle={myHandle} emptyTitle="The board is open" empty="Nobody is on it yet. Finish the whole puzzle signed in and you are." />}
    </section>
  );
}

function GuestNote({ next }: { next: string }) {
  const auth = useAuth();
  if (auth.profile || auth.loading) return null;
  return (
    <p className={styles.guest}>
      Guest scores stay on this device and are never ranked.{' '}
      <Link to={`/signin?next=${encodeURIComponent(next)}`} className={styles.inline}>
        Sign in
      </Link>{' '}
      to get on the board.
    </p>
  );
}

/** /leaderboard. Ranks is the board of the case the player is on. */
export function Leaderboard() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  if (!auth.enabled) return <Navigate to="/play" replace />;
  const signedIn = !!auth.profile;
  // Signed in, Ranks opens on the league; the board of the pack is one tap away. A guest has the pack's board.
  const board = signedIn && params.get('board') !== 'pack' ? 'league' : 'pack';
  return (
    <div className={styles.page}>
      <PageHeader title="Ranks" />
      {signedIn && (
        <div className={styles.switch}>
          <Segmented
            label="Board"
            hideLabel
            options={[
              ['league', 'League'],
              ['pack', 'This pack'],
            ]}
            value={board}
            onChange={(v) => setParams(v === 'pack' ? { board: 'pack' } : {}, { replace: true })}
          />
        </div>
      )}
      {board === 'league' ? <LeagueBoard /> : <CaseRanks myHandle={auth.profile?.handle} />}
      <GuestNote next="/leaderboard" />
    </div>
  );
}

type LeagueLoad = { status: 'loading' } | { status: 'error' } | { status: 'left' } | { status: 'ready'; league: League };

/**
 * This week's league table (BUILD_PLAN set 3g): up to 20 players, ranked by points from first clears. The top 5
 * carry an up mark: they go up a tier when the week ends. Nothing marks the bottom. A player can leave, and join again.
 */
function LeagueBoard() {
  const [load, setLoad] = useState<LeagueLoad>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const read = useCallback(() => {
    fetchMyLeague()
      .then((league) => setLoad(league ? { status: 'ready', league } : { status: 'left' }))
      .catch(() => setLoad({ status: 'error' }));
  }, []);
  useEffect(read, [read]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    await fn().catch(() => undefined);
    setBusy(false);
    setLoad({ status: 'loading' });
    read();
  };

  if (load.status === 'loading') return <SkeletonList rows={8} avatar={28} />;
  if (load.status === 'error') {
    return (
      <PartnerNote moment="error" layout="screen" className={styles.empty}>
        <p>The league did not load. Try again in a moment.</p>
      </PartnerNote>
    );
  }
  if (load.status === 'left') {
    return (
      <PartnerNote layout="screen" title="Out of the league" className={styles.empty}>
        <Button onClick={() => act(joinLeague)} disabled={busy}>
          Join the league
        </Button>
      </PartnerNote>
    );
  }
  const { league } = load;
  return (
    <section className={styles.section} aria-labelledby="league-title" data-league={tierName(league.tier).toLowerCase()}>
      <h2 id="league-title" className={styles.h2}>
        {tierName(league.tier)} league
      </h2>
      <ol className={styles.board} aria-label="This week">
        {league.rows.map((r) => {
          const up = goesUp(r, league.tier);
          return (
            <li key={r.handle} className={styles.leagueRow} data-mine={r.me || undefined} data-up={up || undefined}>
              <span className={styles.rank}>{String(r.place).padStart(2, '0')}</span>
              <Link to={`/u/${r.handle}`} className={styles.handle}>
                <Avatar handle={r.handle} size={28} />
                @{r.handle}
                {r.me && <span className={styles.you}>You</span>}
              </Link>
              <span className={styles.upMark}>{up && <Icon icon={ChevronsUp} size={16} label="Goes up" />}</span>
              <span className={styles.score}>{r.points.toLocaleString('en-US')}</span>
            </li>
          );
        })}
      </ol>
      <p className={styles.leave}>
        <TextLink onClick={() => act(leaveLeague)}>Leave the league</TextLink>
      </p>
    </section>
  );
}

function TeamBoard({ rows, myHandle }: { rows: TeamRow[]; myHandle?: string }) {
  if (rows.length === 0) {
    return (
      <PartnerNote layout="screen" title="No teams yet" className={styles.empty}>
        <p>No teams on this puzzle yet. Open it, choose Play together and send the invite.</p>
      </PartnerNote>
    );
  }
  return (
    <ol className={styles.board} aria-label="Top teams">
      {rows.map((t) => (
        <li key={t.rank} className={styles.team} data-mine={t.players.some((p) => p.handle === myHandle) || undefined}>
          <span className={styles.rank}>{String(t.rank).padStart(2, '0')}</span>
          <ul className={styles.members} aria-label="Team">
            {t.players.map((p) => (
              <li key={p.handle} className={styles.member}>
                <Link to={`/u/${p.handle}`} className={styles.handle}>
                  <Avatar handle={p.handle} size={28} />
                  @{p.handle}
                </Link>
                <span className={styles.found}>{p.finds === 1 ? '1 word' : `${p.finds} words`}</span>
              </li>
            ))}
          </ul>
          <span className={styles.time}>{formatTime(t.secs)}</span>
          <span className={styles.score}>
            {t.words}/{t.total}
          </span>
        </li>
      ))}
    </ol>
  );
}

type GameLoad = { status: 'loading' } | { status: 'error' } | { status: 'solo'; rows: BoardRow[] } | { status: 'together'; rows: TeamRow[] };

/** /leaderboard/:id. Best verified play per player on one curated puzzle, or its teams with ?board=together. */
export function GameLeaderboard() {
  const { id = '' } = useParams();
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const together = params.get('board') === 'together';
  const g = getGameDef(id);
  const key = `${id}|${together}`;
  const [loaded, setLoaded] = useState<{ key: string; load: GameLoad } | null>(null);
  useEffect(() => {
    let alive = true;
    const load: Promise<GameLoad> = together
      ? fetchTogetherBoard(id).then((rows) => ({ status: 'together', rows }))
      : fetchGameBoard(id).then((rows) => ({ status: 'solo', rows }));
    load.then((l) => alive && setLoaded({ key, load: l })).catch(() => alive && setLoaded({ key, load: { status: 'error' } }));
    return () => {
      alive = false;
    };
  }, [id, together, key]);
  const state: GameLoad = loaded?.key === key ? loaded.load : { status: 'loading' };

  if (!auth.enabled || !g) return <Navigate to="/leaderboard" replace />;

  return (
    <div className={styles.page}>
      <Link to="/leaderboard" className={styles.back}>
        <Icon icon={ChevronLeft} size={16} />
        Leaderboard
      </Link>
      <h1 className={styles.title}>
        {g.title}.
        <br />
        <span className={styles.sub}>{together ? 'Best teams.' : 'Best scores.'}</span>
      </h1>
      <section className={styles.section} aria-label={`${g.title} board`}>
        <div className={styles.switch}>
          <Segmented
            label="Board"
            hideLabel
            options={[
              ['solo', 'Solo'],
              ['together', 'Together'],
            ]}
            value={together ? 'together' : 'solo'}
            onChange={(v) => setParams(v === 'together' ? { board: 'together' } : {}, { replace: true })}
          />
        </div>
        {state.status === 'loading' && <SkeletonList rows={8} avatar={28} />}
        {state.status === 'error' && (
          <PartnerNote moment="error" layout="screen" className={styles.empty}>
            <p>The board did not load. Try again in a moment.</p>
          </PartnerNote>
        )}
        {state.status === 'solo' && (
          <Board rows={state.rows} me={null} myHandle={auth.profile?.handle} emptyTitle="The board is open" empty={<>No verified scores on this puzzle yet.</>} />
        )}
        {state.status === 'together' && <TeamBoard rows={state.rows} myHandle={auth.profile?.handle} />}
        {together && (
          <p className={styles.meta}>
            Most words found together, then the faster team. Each player's count is the words they found first. Guests are not ranked.
          </p>
        )}
        <div>
          <Button to={`/play/${g.id}`}>Play {g.title}</Button>
        </div>
        <GuestNote next={`/leaderboard/${g.id}`} />
      </section>
    </div>
  );
}

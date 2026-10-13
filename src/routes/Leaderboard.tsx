import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { formatTime } from '../engine/time';
import { getGameDef } from '../games/catalog';
import { fetchGameBoard, fetchTogetherBoard, type BoardRow, type MyRank, type TeamRow, fetchChapterBoard, type CaseRow } from '../lib/api';
import { openCase } from '../lib/firstCase';
import { chapters } from '../games/chapters';
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

/**
 * The board of a written case: who has worked it, by the points their steps earned. It is what Ranks is.
 */
function CaseRanks({ myHandle }: { myHandle?: string }) {
  const chapter = useMemo(() => openCase()?.chapter ?? chapters[0], []);
  const id = chapter?.id ?? null;
  const [state, setState] = useState<{ id: string; rows: CaseRow[] | 'error' } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchChapterBoard(id)
      .then((rows) => alive && setState({ id, rows: Array.isArray(rows) ? rows : [] }))
      .catch(() => alive && setState({ id, rows: 'error' }));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!chapter) return null;
  const rows = state?.id === id ? state.rows : null;
  const steps = chapter.steps.length;
  return (
    <section className={styles.section} aria-labelledby="case-title" data-case-ranks={chapter.id}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.kicker}>Case · {steps} steps</span>
          <h2 id="case-title" className={styles.h2}>
            {chapter.title}
          </h2>
        </div>
        <Button to={`/case/${chapter.id}`} variant="secondary" size="sm">
          Open the case
        </Button>
      </div>
      {rows == null && <SkeletonList rows={5} avatar={28} />}
      {rows === 'error' && (
        <PartnerNote moment="error" layout="screen" className={styles.empty}>
          <p>The board did not load. Try again in a moment.</p>
        </PartnerNote>
      )}
      {Array.isArray(rows) && rows.length === 0 && (
        <PartnerNote layout="screen" title="The board is open" className={styles.empty}>
          <p>Nobody is on it yet. Finish a step signed in and you are.</p>
        </PartnerNote>
      )}
      {Array.isArray(rows) && rows.length > 0 && (
        <ol className={styles.board} aria-label="Case board">
          {rows.map((r) => (
            <li key={r.handle} className={styles.row} data-mine={r.handle === myHandle || undefined}>
              <span className={styles.rank}>{String(r.rank).padStart(2, '0')}</span>
              <Link to={`/u/${r.handle}`} className={styles.handle}>
                <Avatar handle={r.handle} size={28} />
                @{r.handle}
                {r.handle === myHandle && <span className={styles.you}>You</span>}
              </Link>
              <span className={styles.found}>
                {Math.min(r.steps, steps)}/{steps}
              </span>
              <span className={styles.time}>{r.stars === 1 ? '1 star' : `${r.stars} stars`}</span>
              <span className={styles.score}>{r.score.toLocaleString('en-US')}</span>
            </li>
          ))}
        </ol>
      )}
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

/** /leaderboard. Ranks is the board of the open case. */
export function Leaderboard() {
  const auth = useAuth();
  if (!auth.enabled) return <Navigate to="/play" replace />;
  return (
    <div className={styles.page}>
      <PageHeader title="Ranks" />
      <CaseRanks myHandle={auth.profile?.handle} />
      <GuestNote next="/leaderboard" />
    </div>
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

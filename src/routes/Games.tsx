import { Fragment, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FilterTabs } from '../components/FilterTabs';
import { GameRow } from '../components/GameRow';
import { PageHeader } from '../components/PageHeader';
import { Ring } from '../components/Ring';
import { buttonClass } from '../components/buttonClass';
import { filters, games, getPuzzle, sponsorFor } from '../games/catalog';
import { pick } from '../copy';
import { dayProfile } from '../engine/variableDay';
import { todayHoldsLine } from '../games/resultLines';
import { loadDaily, today } from '../games/daily';
import { loadFinished, shelfCounts } from '../lib/shelves';
import { loadStars } from '../lib/starStore';
import type from '../styles/type.module.css';
import { useStreak, type Streak } from '../lib/useStreak';
import { TextLink } from '../components/TextLink';
import { useAuth } from '../lib/auth';
import { sizeOf } from '../lib/unlocks';
import { keepUnlocked, useUnlocks } from '../lib/useUnlocks';
import { CustomTopic } from './CustomTopic';
import { GameInvites } from './GameInvites';
import { Journey } from './Journey';
import styles from './Games.module.css';

function DailyCard({ streak }: { streak: number }) {
  const t = today();
  const saved = loadDaily(t.n);
  const played = saved?.endAt != null;
  // A saved game that cannot be read still counts as played. It never prints "undefined".
  const found = sizeOf(saved?.found);
  // A run worth keeping is the best reason to play today. Picked once, so it does not change under the reader.
  const keep = useMemo(() => (!played && streak >= 2 ? pick('streakKeep', { n: streak }) : ''), [played, streak]);
  // What today holds, never how much. A puzzle the engine cannot build says nothing.
  const holds = useMemo(() => {
    const p = played ? null : getPuzzle(t.def.id);
    return p ? todayHoldsLine(dayProfile(p), pick) : '';
  }, [played, t.def.id]);
  const withLine = useMemo(() => {
    const w = sponsorFor(t.def);
    return w ? pick('sponsorWith', { name: w.name }) : '';
  }, [t.def]);
  return (
    <Link to={`/d/${t.n}`} className={styles.daily}>
      <span className={styles.dailyText}>
        <span className={styles.kicker}>
          {t.holiday ? `${t.holiday} daily` : 'Daily'} #{t.n} · {t.date}
        </span>
        <span className={styles.dailyTitle}>{t.def.title}</span>
        {withLine && <span className={styles.dailyWith}>{withLine}</span>}
        <span className={styles.dailySub}>
          {played ? `Done for today. You found ${found}. New puzzle at midnight.` : keep || holds || 'One try. Count hidden. Wrong picks cost 10.'}
        </span>
      </span>
      <span className={buttonClass(played ? 'secondary' : 'primary')}>{played ? 'See result' : 'Play today'}</span>
    </Link>
  );
}

/** The last 7 days as a ring, the run, and the days played this month. Shown once there is a daily to count. */
function Week({ run }: { run: Streak }) {
  const days = run.week.filter((d) => d === 'done').length;
  const weekLine = useMemo(() => pick('weekDays', { n: days }), [days]);
  const runLine = useMemo(() => pick('runMonth', { n: run.streak, m: run.month }), [run.streak, run.month]);
  if (!run.played) return null;
  return (
    <div className={styles.week}>
      {/* The line beside it says the same thing, so the ring is not read out twice. */}
      <span aria-hidden="true">
        <Ring parts={run.week} label={weekLine} size={40} />
      </span>
      <p className={styles.weekText}>
        <span className={styles.weekLine}>{weekLine}</span>
        <span className={styles.dailySub}>{runLine}</span>
      </p>
    </div>
  );
}

/** The way to the boards, once there is a finished game to find on one. */
function BoardLink() {
  return (
    <p className={styles.more}>
      <TextLink to="/leaderboard">See today's board</TextLink>
    </p>
  );
}

/** The filter and every puzzle in the catalogue, a shelf line above each category. */
function GameList() {
  const shelves = useMemo(() => shelfCounts(games, loadFinished()), []);
  const stars = useMemo(() => loadStars(), []);
  const [params, setParams] = useSearchParams();
  const filter = filters.includes(params.get('f') ?? '') ? params.get('f')! : 'All';

  const rows = games
    .filter((g) => filter === 'All' || g.category === filter)
    .map((g, i) => ({ g, i }))
    .sort((x, y) => filters.indexOf(x.g.category) - filters.indexOf(y.g.category) || x.i - y.i)
    .flatMap(({ g }) => {
      // A game the engine cannot build is left out, never listed with a blank count.
      const p = getPuzzle(g.id);
      return p
        ? [
            {
              id: g.id,
              category: g.category,
              title: g.title,
              meta: `${p.answers.length} words · ${p.difficulty}`,
              stars: stars[g.id] ?? 0,
              sponsor: sponsorFor(g)?.name,
            },
          ]
        : [];
    });

  return (
    <section className={styles.list} aria-labelledby="all-games">
      <h2 id="all-games" className={type.h2}>
        All games
      </h2>
      <FilterTabs label="Filter games" options={filters} value={filter} onChange={(f) => setParams(f === 'All' ? {} : { f }, { replace: true })} />
      {/* An empty list would leave its rule over nothing. */}
      {rows.length === 0 ? (
        <p className={styles.empty}>
          No games here yet. <TextLink onClick={() => setParams({}, { replace: true })}>See all games</TextLink>
        </p>
      ) : (
        <ul className={styles.rows}>
          {rows.map((r, i) => {
            const shelf = r.category !== rows[i - 1]?.category ? shelves.get(r.category) : undefined;
            return (
              <Fragment key={r.id}>
                {shelf && shelf.total > 0 && (
                  <li className={styles.shelf}>
                    <span className={styles.shelfName}>{r.category}</span>
                    <span>{pick('shelfDone', { n: shelf.done, t: shelf.total })}</span>
                  </li>
                )}
                <GameRow
                  to={`/play/${r.id}`}
                  category={r.category}
                  title={r.title}
                  meta={r.meta}
                  stars={r.stars}
                  sponsor={r.sponsor ? pick('sponsorWith', { name: r.sponsor }) : undefined}
                />
              </Fragment>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** /play. The daily first, then what the player has unlocked (src/lib/unlocks.ts), then every game. */
export function Games() {
  const auth = useAuth();
  const run = useStreak();
  const open = useUnlocks(run.played);
  const { hash } = useLocation();
  // A direct link always works: /play#any-topic shows the input, and it stays from then on.
  const asked = hash === '#any-topic';
  useEffect(() => {
    if (asked) keepUnlocked(['make']);
  }, [asked]);

  return (
    <div className={styles.screen}>
      <PageHeader title="Cases" action={auth.enabled && open.make ? <TextLink to="/make">Make a puzzle</TextLink> : undefined} />

      <div className={styles.today}>
        <DailyCard streak={run.streak} />
        <Week run={run} />
        {auth.enabled && open.boards && <BoardLink />}
      </div>

      <GameInvites />

      <Journey />

      <GameList />

      {(open.make || asked) && (
        <div id="any-topic">
          <CustomTopic />
        </div>
      )}
    </div>
  );
}

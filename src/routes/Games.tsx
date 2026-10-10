import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { guestAvatar } from '../avatar/guest';
import { Avatar } from '../components/Avatar';
import { Partner } from '../components/Partner';
import { PageHeader } from '../components/PageHeader';
import { Ring } from '../components/Ring';
import { buttonClass } from '../components/buttonClass';
import { getPuzzle, sponsorFor } from '../games/catalog';
import { pick } from '../copy';
import { dayProfile } from '../engine/variableDay';
import { todayHoldsLine } from '../games/resultLines';
import { loadDaily, today } from '../games/daily';
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
export function Week({ run }: { run: Streak }) {
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
      {/* One thing to do, then the path. Who is on the case sits small in the corner, and leads to the stage. */}
      <PageHeader title="Cases" action={<Crew />} />

      <DailyCard streak={run.streak} />

      <GameInvites />

      <Journey />

      {auth.enabled && open.make && (
        <p className={styles.more}>
          <TextLink to="/make">Make a puzzle</TextLink>
        </p>
      )}

      {(open.make || asked) && (
        <div id="any-topic">
          <CustomTopic />
        </div>
      )}
    </div>
  );
}

/** Who is on the case, small: the player's detective and their partner. It leads to the stage where both are chosen. */
function Crew() {
  const { profile } = useAuth();
  const starter = useMemo(() => guestAvatar(), []);
  return (
    <Link to="/me" className={styles.crew} data-crew aria-label="Change your detective, pet and gear">
      {profile ? <Avatar handle={profile.handle} size={36} /> : <Avatar parts={starter} size={36} />}
      <Partner moment="empty" size={36} />
    </Link>
  );
}
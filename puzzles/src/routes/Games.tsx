import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { guestAvatar } from '../avatar/guest';
import { Avatar } from '../components/Avatar';
import { Partner } from '../components/Partner';
import { PageHeader } from '../components/PageHeader';
import { Ring } from '../components/Ring';
import { pick } from '../copy';
import { useStreak, type Streak } from '../lib/useStreak';
import { TextLink } from '../components/TextLink';
import { useAuth } from '../lib/auth';
import { keepUnlocked, useUnlocks } from '../lib/useUnlocks';
import { CustomTopic } from './CustomTopic';
import { GameInvites } from './GameInvites';
import { Journey } from './Journey';
import styles from './Games.module.css';

/** The last 7 days as a ring, the run, and the days played this month. Shown once there is a daily to count. */
/** `best`: the best week's points (from the account), shown when there is one. */
export function Week({ run, best = 0 }: { run: Streak; best?: number }) {
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
        {best > 0 && <span className={styles.dailySub} data-best-week>Best week: {best.toLocaleString('en-US')} points.</span>}
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
      <PageHeader title="Packs" action={<Crew />} />

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
    <Link to="/me" className={styles.crew} data-crew aria-label="Change your look and your pet">
      {profile ? <Avatar handle={profile.handle} size={36} /> : <Avatar parts={starter} size={36} />}
      <Partner moment="empty" size={36} />
    </Link>
  );
}
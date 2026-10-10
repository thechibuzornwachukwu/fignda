import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { SkeletonList } from '../components/Skeleton';
import { askFriendStreak, endFriendStreak, myFriendStreaks, myStreakLink, nudgeFriend, type FriendStreak } from '../lib/api';
import { copyText } from '../lib/share';
import styles from './Players.module.css';

/** Whose move it is today, in a few words. */
function status(f: FriendStreak): string {
  if (f.state === 'incoming') return 'Wants a streak with you';
  if (f.state === 'outgoing') return 'Asked. Waiting for a yes';
  if (f.you_today && f.them_today) return 'Both played today';
  if (f.them_today) return 'Played today. Your turn';
  if (f.you_today) return 'You played. Waiting on them';
  return 'Nobody has played today yet';
}

/** Your friend streaks, and the list every screen reads them from. */
// eslint-disable-next-line react-refresh/only-export-components
export function useFriendStreaks(enabled: boolean) {
  const [rows, setRows] = useState<FriendStreak[] | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    myFriendStreaks()
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [enabled, tick]);
  return { rows: enabled ? rows : [], reload };
}

/**
 * /players, signed in: streaks you share with one other player. Up to 5.
 * Start one with a link (works for friends who are not on Gazecraft yet) or from a player's profile.
 */
export function FriendStreaks({ quiet = false }: { /** Not unlocked yet: show nothing unless the player is already in one or has been asked. */ quiet?: boolean }) {
  const { rows, reload } = useFriendStreaks(true);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [nudged, setNudged] = useState<string[]>([]);

  const act = async (handle: string, what: 'yes' | 'end') => {
    setBusy(handle);
    setNote('');
    if (what === 'yes') {
      const r = await askFriendStreak(handle).catch(() => 'failed' as const);
      if (r === 'limit') setNote('You can keep 5 friend streaks at once. End one to start another.');
      else if (r === 'failed') setNote('That did not work. Try again.');
    } else if (!(await endFriendStreak(handle).catch(() => false))) setNote('That did not work. Try again.');
    setBusy('');
    reload();
  };

  const nudge = async (f: FriendStreak) => {
    setBusy(f.handle);
    const r = await nudgeFriend(f.handle);
    setBusy('');
    setNudged((n) => [...n, f.handle]);
    setNote(
      r.ok || r.error === 'already_nudged'
        ? `${f.name} has been nudged. One a day.`
        : r.error === 'already_played'
          ? `${f.name} has just played.`
          : 'The nudge did not go out. Try again later.',
    );
    if (r.error === 'already_played') reload();
  };

  // One link for everyone you send it to. Phones open the share sheet (WhatsApp is one tap), desktops copy.
  const invite = async () => {
    setNote('');
    const code = await myStreakLink().catch(() => null);
    if (!code) return setNote('We could not make your link. Try again.');
    const url = `${window.location.origin}/s/${code}`;
    const text = 'Keep a daily streak with me on Gazecraft. We both play, it grows.';
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'Gazecraft', text, url });
        return;
      } catch {
        /* closed the sheet: fall back to copying */
      }
    }
    setNote((await copyText(`${text} ${url}`)) ? 'Link copied. Send it to a friend. Their yes starts the streak.' : url);
  };

  if (quiet && !rows?.length) return null;
  return (
    <section id="friend-streaks" className={styles.section} aria-labelledby="friend-streaks-title">
      <div className={styles.sectionHead}>
        <h2 id="friend-streaks-title" className={styles.h2}>
          Friend streaks
        </h2>
        <Button variant="secondary" size="sm" onClick={invite}>
          Invite a friend
        </Button>
      </div>
      {rows == null ? (
        <SkeletonList rows={2} avatar={40} sub />
      ) : rows.length === 0 ? (
        <p className={styles.muted}>
          A streak you share with a friend. It grows each day you both play the daily. Send your link to anyone, or open a player's profile and
          choose Start a streak.
        </p>
      ) : (
        <ul className={styles.list}>
          {rows.map((f) => (
            <li key={f.handle} className={styles.item}>
              <Link to={`/u/${f.handle}`} className={styles.row}>
                <Avatar handle={f.handle} size={40} />
                <span className={styles.who}>
                  <span className={styles.name}>{f.name}</span>
                  <span className={styles.handle}>{status(f)}</span>
                </span>
                {f.state === 'active' && <span className={styles.stat}>{f.streak === 1 ? '1 day' : `${f.streak} days`}</span>}
              </Link>
              {f.state === 'incoming' && (
                <button type="button" className={styles.follow} aria-pressed="true" disabled={busy === f.handle} onClick={() => void act(f.handle, 'yes')}>
                  Start
                </button>
              )}
              {f.state === 'active' && f.you_today && !f.them_today && (
                <button
                  type="button"
                  className={styles.follow}
                  disabled={busy === f.handle || nudged.includes(f.handle)}
                  aria-label={`Nudge ${f.name}`}
                  onClick={() => void nudge(f)}
                >
                  {nudged.includes(f.handle) ? 'Nudged' : 'Nudge'}
                </button>
              )}
              <button
                type="button"
                className={styles.follow}
                disabled={busy === f.handle}
                aria-label={`${f.state === 'active' ? 'End streak with' : f.state === 'incoming' ? 'Say no to' : 'Take back ask to'} ${f.name}`}
                onClick={() => void act(f.handle, 'end')}
              >
                {f.state === 'active' ? 'End' : f.state === 'incoming' ? 'No' : 'Cancel'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note} role="status">
        {note}
      </p>
    </section>
  );
}

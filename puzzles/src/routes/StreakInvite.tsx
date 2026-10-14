import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { joinStreakLink, streakLinkInfo, type PlayerRef } from '../lib/api';
import { useAuth } from '../lib/auth';
import styles from './StreakInvite.module.css';

/**
 * /s/CODE. A friend's streak link. Sending the link was the ask, so one tap here starts the streak.
 * New players sign up first and land back here.
 */
export function StreakInvite() {
  const { code = '' } = useParams();
  const auth = useAuth();
  const nav = useNavigate();
  const [from, setFrom] = useState<PlayerRef | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    streakLinkInfo(code)
      .then((p) => alive && setFrom(p))
      .catch(() => alive && setFrom(null));
    return () => {
      alive = false;
    };
  }, [code]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  if (from === undefined || auth.loading) return <div className={styles.page} aria-busy="true" />;
  if (!from) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>This link has run out.</h1>
        <p className={styles.lead}>Ask your friend for a new one, or find a puzzle.</p>
        <div>
          <Button to="/play">Play</Button>
        </div>
      </div>
    );
  }

  const own = auth.profile?.handle === from.handle;
  const start = async () => {
    setBusy(true);
    const r = await joinStreakLink(code).catch(() => 'failed' as const);
    setBusy(false);
    if (r === 'started' || r === 'exists') return nav('/players#friend-streaks');
    setNote(r === 'limit' ? 'One of you already keeps 5 friend streaks. End one to start another.' : 'That did not work. Try again.');
  };

  return (
    <div className={styles.page}>
      <Avatar handle={from.handle} size={88} />
      <h1 className={styles.title}>
        {own ? 'This is your own link.' : `${from.name} wants a streak with you.`}
        <br />
        <span className={styles.sub}>{own ? 'Send it to a friend.' : 'Play the daily, both of you.'}</span>
      </h1>
      <p className={styles.lead}>
        A friend streak grows each day you both play the daily. Miss a day, either of you, and it starts again. You each see when the other has
        played.
      </p>
      <div className={styles.actions}>
        {own ? (
          <Button to="/players#friend-streaks">Your friend streaks</Button>
        ) : auth.profile ? (
          <Button variant="accent" onClick={start} disabled={busy}>
            Start the streak
          </Button>
        ) : (
          <Button variant="accent" to={`/signin?next=${encodeURIComponent(`/s/${code}`)}`}>
            Sign in to start
          </Button>
        )}
      </div>
      <p className={styles.note} role="status">
        {note}
      </p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { TextLink } from '../components/TextLink';
import { dayNo } from '../engine/daily';
import { fetchDailyDays, localDailies } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dailyStats } from '../lib/streak';
import styles from './Account.module.css';

export function Account() {
  const auth = useAuth();
  const nav = useNavigate();
  const [days, setDays] = useState<number[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Set while signing out or deleting, so the signed-out redirect below does not race our own.
  const [leaving, setLeaving] = useState(false);

  const userId = auth.session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetchDailyDays()
      .then((d) => alive && setDays(d))
      .catch(() => alive && setDays([]));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (leaving) return <div className={styles.screen} aria-busy="true" />;
  if (!auth.enabled) return <Navigate to="/signin" replace />;
  if (auth.loading) return <div className={styles.screen} aria-busy="true" />;
  if (!auth.session) return <Navigate to="/signin?next=%2Faccount" replace />;
  if (!auth.profile) return <Navigate to="/signin?next=%2Faccount" replace />;

  const p = auth.profile;
  // Server rows plus dailies in this browser not merged yet.
  const all = [...(days ?? []), ...localDailies().map((d) => d.day_no)];
  const { played, streak } = dailyStats(all, dayNo());

  const onDelete = async () => {
    setBusy(true);
    setErr('');
    try {
      setLeaving(true);
      await auth.deleteAccount();
      nav('/', { replace: true });
    } catch {
      setLeaving(false);
      setBusy(false);
      setErr('We could not delete your account. Try again.');
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {p.name.charAt(0).toUpperCase()}
        </span>
        <div className={styles.names}>
          <h1 className={styles.name}>{p.name}</h1>
          <span className={styles.meta}>
            @{p.handle} · {auth.email}
          </span>
        </div>
      </div>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Dailies played</dt>
          <dd className={styles.statValue}>{days == null ? '·' : played}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Streak</dt>
          <dd className={styles.statValue}>{days == null ? '·' : `${streak} ${streak === 1 ? 'day' : 'days'}`}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <Button to="/play">Play</Button>
        <Button variant="secondary" to="/signin?edit=1">
          Edit name
        </Button>
        <button type="button" className={styles.plain} onClick={async () => {
            setLeaving(true);
            await auth.signOut();
            nav('/', { replace: true });
          }}>
          Sign out
        </button>
      </div>

      <div className={styles.danger}>
        <TextLink onClick={() => setConfirm(true)}>Delete account</TextLink>
      </div>

      <Dialog open={confirm} onClose={() => !busy && setConfirm(false)} label="Delete account">
        <div className={styles.confirm}>
          <h2 className={styles.confirmTitle}>Delete your account?</h2>
          <p className={styles.confirmText}>
            This removes your profile, scores and shared cards. It cannot be undone.
          </p>
          <p className={styles.err} role="alert">
            {err}
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>
              Keep my account
            </Button>
            <Button variant="primary" onClick={onDelete} disabled={busy}>
              Delete account
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

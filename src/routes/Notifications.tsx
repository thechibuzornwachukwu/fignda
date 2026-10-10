import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Award } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { PartnerNote } from '../components/PartnerNote';
import { SkeletonList } from '../components/Skeleton';
import { fetchNotifications, markNotificationsRead } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ago, describe, type Note } from '../lib/notifications';
import { announceRead } from '../lib/useUnread';
import styles from './Notifications.module.css';

/** /notifications. What happened while you were away, newest first. Opening the page marks it all read. */
export function Notifications() {
  const auth = useAuth();
  const me = auth.profile;
  const [rows, setRows] = useState<Note[] | null>(null);

  useEffect(() => {
    if (!me) return;
    let alive = true;
    fetchNotifications()
      .then((r) => {
        if (!alive) return;
        setRows(r);
        // New ones stay marked on this visit; the count in the header clears now.
        if (r.some((n) => n.unread)) void markNotificationsRead().then(announceRead);
      })
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [me]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  if (auth.loading) return <div className={styles.page} aria-busy="true" />;
  if (!me) return <Navigate to="/signin?next=%2Fnotifications" replace />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        Notifications.
        <br />
        <span className={styles.sub}>What you missed.</span>
      </h1>
      {rows == null ? (
        <SkeletonList rows={5} avatar={40} stat={false} />
      ) : rows.length === 0 ? (
        <div className={styles.empty}>
          <PartnerNote>
            <p className={styles.muted}>Nothing yet. Follows, streak asks, room invites and badges will show up here.</p>
          </PartnerNote>
          <div>
            <Button to="/players">Find players</Button>
          </div>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((n) => {
            const d = describe(n);
            return (
              <li key={n.id}>
                <Link to={d.to} className={styles.row} data-unread={n.unread || undefined}>
                  {n.handle ? (
                    <Avatar handle={n.handle} size={40} />
                  ) : (
                    <span className={styles.badge}>
                      <Icon icon={Award} size={20} />
                    </span>
                  )}
                  <span className={styles.text}>
                    {d.text}
                    {n.unread && <span className={styles.srOnly}> New.</span>}
                  </span>
                  <span className={styles.when}>{ago(n.created_at)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

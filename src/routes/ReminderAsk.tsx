import { useEffect, useState } from 'react';
import { TextLink } from '../components/TextLink';
import { enableReminder, reminderState, type ReminderState } from '../lib/push';
import styles from './GameResults.module.css';

/**
 * Shown under today's result, the one moment a reminder is worth something to the player. Only when this
 * browser can do it and they have not chosen yet. The browser's own permission prompt follows the tap.
 */
export function ReminderAsk() {
  const [state, setState] = useState<ReminderState | null>(null);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    let alive = true;
    reminderState()
      .then((s) => alive && setState(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (asked && state?.status === 'on') {
    return (
      <p className={styles.note} role="status">
        Done. One nudge a day, only if you have not played. Change it in Settings.
      </p>
    );
  }
  if (asked && state?.status === 'blocked') {
    return (
      <p className={styles.note} role="status">
        Notifications are blocked for this site. Allow them in your browser settings to get a reminder.
      </p>
    );
  }
  if (state?.status !== 'off') return null;
  return (
    <p className={styles.note}>
      <TextLink
        onClick={() => {
          setAsked(true);
          void enableReminder().then(setState);
        }}
      >
        Remind me tomorrow
      </TextLink>
    </p>
  );
}

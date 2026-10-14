import { useEffect, useState } from 'react';
import { Segmented } from '../components/Segmented';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { Toggle } from '../components/Toggle';
import { DEFAULT_HOUR, disableReminder, enableReminder, reminderState, setReminderHour, type ReminderState } from '../lib/push';
import styles from './Settings.module.css';

const WHY: Partial<Record<ReminderState['status'], string>> = {
  unsupported: 'This browser cannot send reminders. On iPhone, add Gazecraft to your Home Screen and open it from there.',
  unavailable: 'Reminders are not switched on yet. Check back soon.',
  blocked: 'Notifications are blocked for this site. Allow them in your browser settings, then turn this on.',
};

/** Settings, Reminders: one nudge a day at a time you pick, and only on days you have not played. */
export function Reminders() {
  const [state, setState] = useState<ReminderState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    reminderState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState({ status: 'unavailable' }));
    return () => {
      alive = false;
    };
  }, []);

  if (!state) {
    return (
      <SkeletonGroup>
        <Skeleton width="70%" height={44} />
      </SkeletonGroup>
    );
  }
  const on = state.status === 'on';
  const canToggle = on || state.status === 'off';

  const toggle = async (next: boolean) => {
    setBusy(true);
    if (next) setState(await enableReminder(DEFAULT_HOUR));
    else {
      await disableReminder().catch(() => {});
      setState({ status: 'off' });
    }
    setBusy(false);
  };

  return (
    <div className={styles.narrow}>
      <Toggle
        label="Daily reminder"
        note="One nudge a day, only if you have not played yet."
        checked={on}
        disabled={busy || !canToggle}
        onChange={(v) => void toggle(v)}
      />
      {on && (
        <Segmented
          label="When"
          options={[
            ['8', 'Morning'],
            ['13', 'Midday'],
            ['19', 'Evening'],
          ]}
          value={String(state.hour) as '8' | '13' | '19'}
          onChange={(h) => {
            setState({ status: 'on', hour: Number(h) });
            void setReminderHour(Number(h));
          }}
        />
      )}
      {WHY[state.status] && <p className={styles.help}>{WHY[state.status]}</p>}
    </div>
  );
}

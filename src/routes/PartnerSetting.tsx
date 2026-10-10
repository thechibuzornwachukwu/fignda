import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Partner } from '../components/Partner';
import { nextAt, PARTNERS, slotsFor, standingOf, type PartnerId } from '../engine/partners';
import { choosePartner, syncPartner, usePartner } from '../lib/partner';
import styles from './PartnerSetting.module.css';

const points = (n: number) => n.toLocaleString('en-US');

/**
 * Settings, Your partner: the partners as tiles. The one beside you is pressed. One you hold is a tap away.
 * One your points allow can be taken. One they do not yet allow is shown with the points it opens at.
 */
export function PartnerSetting() {
  const mine = usePartner();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  // Points move with play: read the account's count each time this is opened.
  useEffect(() => {
    void syncPartner();
  }, []);

  const pick = async (id: PartnerId) => {
    if (busy || id === mine.current) return;
    setBusy(true);
    setNote('');
    const ok = await choosePartner(id, true);
    setBusy(false);
    if (!ok) setNote('That did not save. Try again.');
  };

  const at = nextAt(mine);
  const spare = slotsFor(mine.points) - mine.owned.length;
  return (
    <div className={styles.wrap}>
      <div className={styles.tiles} role="group" aria-label="Your partner">
        {PARTNERS.map((p) => {
          const how = standingOf(mine, p.id, mine.points);
          const on = p.id === mine.current;
          const locked = how === 'locked';
          const hint = locked && at != null ? `Reach ${points(at)} points.` : how === 'open' ? 'Yours to take.' : '';
          return (
            <button
              key={p.id}
              type="button"
              className={styles.tile}
              aria-pressed={on}
              aria-disabled={locked || undefined}
              data-locked={locked || undefined}
              aria-label={`${p.name}${locked ? `. Locked. ${hint}` : how === 'open' ? `. ${hint}` : ''}`}
              disabled={busy && !locked}
              onClick={() => !locked && void pick(p.id)}
            >
              <Partner who={p.id} moment={on ? 'done' : locked ? 'asleep' : 'empty'} size={72} />
              <span className={styles.name}>{p.name}</span>
              <span className={styles.hint}>
                {locked && <Icon icon={Lock} size={16} />}
                {hint || (on ? 'With you now.' : 'Yours.')}
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.line} role="status">
        {note || (spare > 0 ? (spare === 1 ? 'You can take 1 more partner.' : `You can take ${spare} more partners.`) : at != null ? `Your next partner opens at ${points(at)} points. You have ${points(mine.points)}.` : 'You hold every partner.')}
      </p>
    </div>
  );
}
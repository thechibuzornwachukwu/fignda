import { useMemo, type ReactNode } from 'react';
import { pick, type PoolKey } from '../copy';
import type { PartnerId } from '../engine/partners';
import { usePartner } from '../lib/partner';
import { Partner } from './Partner';
import styles from './PartnerNote.module.css';

/** What each partner says, in its own voice (design/brand): when something did not load, and when a case is closed. */
const SAY: Record<'error' | 'closed', Record<PartnerId, PoolKey>> = {
  error: { cat: 'sayErrorCat', dino: 'sayErrorDino', dog: 'sayErrorDog', robot: 'sayErrorRobot' },
  closed: { cat: 'sayClosedCat', dino: 'sayClosedDino', dog: 'sayClosedDog', robot: 'sayClosedRobot' },
};

type Props = {
  /** Nothing here yet, something that did not load, or a case just closed. It sets the partner's mood. */
  moment?: 'empty' | 'error' | 'closed';
  size?: number;
  className?: string;
  /** The line that says what happened and what to do. The partner never replaces it. */
  children?: ReactNode;
};

/**
 * The player's partner beside a line: an empty list, a load that failed, a closed case. The words carry the meaning
 * and the partner the mood, so a screen with nothing on it is never just grey text. On an error and a closed case
 * the partner says one short thing of its own first.
 */
export function PartnerNote({ moment = 'empty', size = 48, className, children }: Props) {
  const { current } = usePartner();
  const said = useMemo(() => (moment === 'empty' ? '' : pick(SAY[moment][current])), [moment, current]);
  return (
    <div className={[styles.note, className].filter(Boolean).join(' ')} data-partner-note={moment}>
      <Partner moment={moment === 'closed' ? 'found' : moment} size={size} className={styles.partner} />
      <div className={styles.body}>
        {said && <p className={styles.say}>{said}</p>}
        {children}
      </div>
    </div>
  );
}

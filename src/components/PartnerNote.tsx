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
  /**
   * `screen`: the empty state is what the screen is showing, so the pet is large and centred in the empty space, over a
   * short title, the line and its one action. `inline`: a section inside a busy screen, so the pet is small beside the line.
   */
  layout?: 'screen' | 'inline';
  /** Why it is empty, in a few words. Shown on the `screen` layout, over the line. */
  title?: string;
  /** Left out: 144 on a screen, 48 inline. */
  size?: number;
  className?: string;
  /** The line that says what happened and what to do. The partner never replaces it. */
  children?: ReactNode;
};

/**
 * The player's pet with a line: an empty board or list, a load that failed, a closed case. The words carry the meaning
 * and the pet the mood, so a screen with nothing on it is never just grey text. On an error and a closed case the pet
 * says one short thing of its own first. One pet a screen: where 2 sections are empty at once, only one shows it.
 */
export function PartnerNote({ moment = 'empty', layout = 'inline', title, size, className, children }: Props) {
  const { current } = usePartner();
  const said = useMemo(() => (moment === 'empty' ? '' : pick(SAY[moment][current])), [moment, current]);
  return (
    <div className={[styles.note, className].filter(Boolean).join(' ')} data-partner-note={moment} data-layout={layout}>
      <Partner moment={moment === 'closed' ? 'found' : moment} size={size ?? (layout === 'screen' ? 144 : 48)} className={styles.partner} />
      <div className={styles.body}>
        {said && <p className={styles.say}>{said}</p>}
        {title && <p className={styles.title}>{title}</p>}
        {children}
      </div>
    </div>
  );
}

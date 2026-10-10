import { bondTier, partnerSrc, type Moment, type PartnerId } from '../engine/partners';
import { usePartner } from '../lib/partner';
import styles from './Partner.module.css';

type Props = {
  /** What is happening: it sets the mood. One mood per moment. */
  moment: Moment;
  /** Square size in px. */
  size?: number;
  /** A named partner, for the places that offer a choice. Left out: the player's own. */
  who?: PartnerId;
  /** Someone else's partner: drawn without this player's bond. */
  plain?: boolean;
  className?: string;
};

/** The player's partner, in the mood of the moment. Decorative: the words beside it carry the meaning. */
export function Partner({ moment, size = 56, who, plain = false, className }: Props) {
  const mine = usePartner();
  const id = who ?? mine.current;
  // The bond shows: a partner with cases behind them carries more of their kit.
  const tier = plain ? 0 : bondTier(mine.bonds[id] ?? 0);
  return <img className={[styles.partner, className].filter(Boolean).join(' ')} src={partnerSrc(id, moment, tier)} data-bond={tier || undefined} width={size} height={size} alt="" data-partner={id} data-moment={moment} decoding="async" />;
}
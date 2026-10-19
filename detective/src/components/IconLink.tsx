import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import styles from './IconLink.module.css';

type Props = {
  icon: LucideIcon;
  /** What a screen reader says, and the tooltip: the action, since the icon carries no words. */
  label: string;
} & ({ to: string; onClick?: () => void } | { to?: undefined; onClick: () => void });

/** A page action as an icon in a 44 square (SPEC section 4): a link with `to`, else a button. */
export function IconLink({ icon, label, to, onClick }: Props) {
  if (to !== undefined)
    return (
      <Link to={to} onClick={onClick} className={styles.link} aria-label={label} title={label}>
        <Icon icon={icon} size={18} />
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={styles.link} aria-label={label} title={label}>
      <Icon icon={icon} size={18} />
    </button>
  );
}

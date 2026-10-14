import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import styles from './IconLink.module.css';

type Props = {
  to: string;
  icon: LucideIcon;
  /** What it does. With `text` left out this is the accessible name of an icon alone. */
  label: string;
  /** Show the label beside the icon. For actions an icon alone would not explain. */
  text?: boolean;
};

/**
 * A page action as an icon: a square button the size of a thumb. Alone for the few icons everyone reads
 * (a gear is settings), with its label beside it for anything else.
 */
export function IconLink({ to, icon, label, text = false }: Props) {
  return (
    <Link to={to} className={[styles.link, text && styles.text].filter(Boolean).join(' ')} aria-label={text ? undefined : label} title={text ? undefined : label}>
      <Icon icon={icon} size={18} />
      {text && <span>{label}</span>}
    </Link>
  );
}
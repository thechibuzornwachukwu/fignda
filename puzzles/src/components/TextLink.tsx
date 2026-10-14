import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './TextLink.module.css';

type Props = {
  children: ReactNode;
  className?: string;
} & ({ to: string; onClick?: () => void } | { to?: undefined; onClick: () => void });

/** Underlined text action. Renders a link with `to`, else a button. */
export function TextLink({ to, onClick, className, children }: Props) {
  const cls = [styles.link, className].filter(Boolean).join(' ');
  if (to !== undefined) {
    return (
      <Link to={to} onClick={onClick} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

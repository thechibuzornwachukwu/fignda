import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonClass';

type Common = {
  variant?: ButtonVariant;
  /** `md` 48, `touch` 44 (mobile bar), `sm` 36 (header). */
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type AsLink = Common & { to: string; onClick?: () => void; 'aria-label'?: string };

/** One accent button per screen. */
export function Button(props: AsButton | AsLink) {
  const { variant = 'primary', size = 'md', className, children } = props;
  const cls = buttonClass(variant, size, className);

  if (props.to !== undefined) {
    return (
      <Link to={props.to} onClick={props.onClick} aria-label={props['aria-label']} className={cls}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, size: _s, className: _c, to: _t, type = 'button', ...rest } = props;
  return (
    <button type={type} {...rest} className={cls}>
      {children}
    </button>
  );
}

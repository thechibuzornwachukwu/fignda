import type { LucideIcon } from 'lucide-react';

/** 16 inline, 18 controls, 20 cards. `em` scales with the surrounding type (display CTAs). */
export type IconSize = 16 | 18 | 20 | 'em';

type Props = {
  icon: LucideIcon;
  size?: IconSize;
  /** Accessible name. Omit for decorative icons next to text. */
  label?: string;
  className?: string;
};

/** The only way to render a lucide icon. Stroke is fixed at 1.75. */
export function Icon({ icon: Glyph, size = 16, label, className }: Props) {
  return (
    <Glyph
      size={size === 'em' ? '1em' : size}
      strokeWidth={1.75}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      style={{ flex: 'none' }}
    />
  );
}

import { createElement } from 'react';
import styles from './Logo.module.css';
import { CAT, CAT_BOX, CAT_IN_WORDMARK, WORDMARK_BOX } from '../brand/cat';
import { LOGO_G, LOGO_REST } from './logoPaths';

type Props = { height?: number; className?: string };

/** SVG attribute names to React prop names (stroke-width to strokeWidth). */
const toProps = (attrs: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v]));
const cat = () => CAT.map((s, i) => createElement(s.tag, { key: i, ...toProps(s.attrs) }));

/** The Gazecraft mark from SPEC section 1: the cat. Never redraw. */
export function LogoMark({ height = 30, className }: Props) {
  return (
    <svg
      width={(height * CAT_BOX[2]) / CAT_BOX[3]}
      height={height}
      viewBox={CAT_BOX.join(' ')}
      aria-hidden="true"
      focusable="false"
      className={[styles.logo, className].filter(Boolean).join(' ')}
    >
      {cat()}
    </svg>
  );
}

/** The wordmark: the cat, then GAZECRAFT. Capitals are 88% of the height. */
export function Logo({ height = 22, className }: Props) {
  return (
    <svg
      width={(height * WORDMARK_BOX[2]) / WORDMARK_BOX[3]}
      height={height}
      viewBox={WORDMARK_BOX.join(' ')}
      role="img"
      aria-label="Gazecraft"
      focusable="false"
      className={[styles.logo, className].filter(Boolean).join(' ')}
    >
      <g transform={CAT_IN_WORDMARK}>{cat()}</g>
      <path d={LOGO_G + LOGO_REST} fill="currentColor" />
    </svg>
  );
}

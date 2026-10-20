import type { Print as PrintOf } from '../engine/chapter';
import styles from './Piece.module.css';

/** The print is drawn 100 units a piece, 3 across and 2 down. */
const CELL = 100;

/**
 * The print itself, drawn once a screen: a gloved right hand pressed flat on glass, lifted in grey powder. The grip
 * of a rubber cleaning glove is a field of raised diamonds, so the powder holds to the diamonds and the creases
 * between them stay clear. Uneven, as lifted powder is.
 */
export function PrintDefs({ of }: { of: PrintOf['of'] }) {
  if (of !== 'rubber-glove') return null;
  return (
    <svg className={styles.defs} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="grip" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect x="1.4" y="1.4" width="6.2" height="6.2" rx="0.8" />
        </pattern>
        <filter id="powder" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.5" result="holes" />
          <feComposite in="SourceGraphic" in2="holes" operator="in" />
        </filter>
        <clipPath id="hand">
          {/* The palm, the heel of the hand, 4 fingers and the thumb, as a flat hand leaves them. */}
          <ellipse cx="160" cy="138" rx="66" ry="54" />
          <rect x="96" y="28" width="27" height="96" rx="13.5" transform="rotate(-8 110 120)" />
          <rect x="128" y="10" width="28" height="110" rx="14" transform="rotate(-2 142 120)" />
          <rect x="161" y="14" width="28" height="106" rx="14" transform="rotate(3 175 120)" />
          <rect x="193" y="38" width="25" height="88" rx="12.5" transform="rotate(10 205 120)" />
          <rect x="54" y="104" width="30" height="82" rx="15" transform="rotate(-48 70 150)" />
        </clipPath>
        <g id="print">
          <g clipPath="url(#hand)" filter="url(#powder)">
            <rect width={CELL * 3} height={CELL * 2} fill="url(#grip)" />
          </g>
        </g>
      </defs>
    </svg>
  );
}

/** 1 piece of the print: the cell at `cell`, counted in reading order. */
export function Print({ cell, cols, rows }: { cell: number; cols: number; rows: number }) {
  const x = (cell % cols) * CELL;
  const y = Math.floor(cell / cols) * CELL;
  return (
    <svg className={styles.cut} viewBox={`${x} ${y} ${CELL} ${CELL}`} data-rows={rows} aria-hidden="true" focusable="false">
      <use href="#print" />
    </svg>
  );
}

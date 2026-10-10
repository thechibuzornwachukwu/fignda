import { createElement, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { avatarFor, drawDisguise, shapeProps, VIEW_BOX } from '../avatar/draw';
import { pick } from '../copy';
import { culpritFor } from '../games/caseFile';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import styles from './CaseFile.module.css';

type SlotsProps = {
  /** One per letter of the secret: the letter, or an empty string while it is not found. */
  slots: readonly string[];
  /** Slots filled a moment ago: they pop in. */
  fresh?: readonly number[];
  className?: string;
};

/** The secret of a case as a row of letter slots, filled where the player holds a piece. One accessible name. */
export function SecretSlots({ slots, fresh = [], className }: SlotsProps) {
  const found = slots.filter(Boolean).length;
  const whole = slots.length > 0 && found === slots.length;
  const label = whole ? `The secret: ${slots.join('')}.` : `The secret: ${found} of ${slots.length} letters found.`;
  return (
    <span className={[styles.slots, className].filter(Boolean).join(' ')} role="img" aria-label={label} data-secret={whole ? 'whole' : 'part'}>
      {slots.map((ch, i) => (
        <span key={i} className={styles.slot} data-slot={ch ? 'on' : 'off'} data-fresh={(ch && fresh.includes(i)) || undefined} aria-hidden="true">
          {ch}
        </span>
      ))}
    </span>
  );
}

type CulpritProps = {
  /** The case, by its puzzle id. */
  id: string;
  size?: number;
  /** `masked` while the case is open, `unmasking` the moment it closes (the mask lifts off once), `unmasked` after. */
  state: 'masked' | 'unmasking' | 'unmasked';
  className?: string;
};

/** The culprit of a case: an ordinary avatar with a disguise drawn on top in a layer of its own. Decorative. */
export function Culprit({ id, size = 48, state, className }: CulpritProps) {
  const who = useMemo(() => culpritFor(id), [id]);
  const parts = useMemo(() => avatarFor(who.seed), [who.seed]);
  const mask = useMemo(() => drawDisguise(parts, who.disguise), [parts, who.disguise]);
  return (
    <span className={[styles.culprit, className].filter(Boolean).join(' ')} style={{ width: size, height: size }} data-culprit={state}>
      <Avatar parts={parts} size={size} />
      {state !== 'unmasked' && (
        <svg className={styles.mask} width={size} height={size} viewBox={VIEW_BOX} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          {mask.map((s, i) => createElement(s.tag, { key: i, ...shapeProps(s.attrs) }))}
        </svg>
      )}
    </span>
  );
}

/** A clue just done: the secret with the new piece in place, and one line about it. */
export function CasePiece({ slots, fresh, piece }: { slots: readonly string[]; fresh: readonly number[]; piece: string }) {
  const line = useMemo(() => (piece ? pick('pieceFound', { p: piece }) : ''), [piece]);
  return (
    <div className={styles.piece} data-case-piece>
      <SecretSlots slots={slots} fresh={fresh} />
      {line && <p className={styles.line}>{line}</p>}
    </div>
  );
}

/** The unmasking: the mask lifts off, the stamp lands, the secret reads whole, the culprit owns up and the card is found. */
export function CaseClosed({ id, secret }: { id: string; secret: string }) {
  const lines = useMemo(
    () => ({ confession: pick('confession', { who: culpritFor(id).name, secret: secret.toLowerCase() }), card: pick('callingCard') }),
    [id, secret],
  );
  return (
    <div className={styles.closed} data-case-closed>
      <div className={styles.scene}>
        <Culprit id={id} size={72} state="unmasking" />
        <h3 className={styles.stamp}>Case closed</h3>
      </div>
      <SecretSlots slots={[...secret]} />
      <p className={styles.confession}>{lines.confession}</p>
      <p className={styles.card}>
        <span className={styles.cardMark}>
          <Icon icon={Eye} size={16} />
        </span>
        {lines.card}
      </p>
    </div>
  );
}

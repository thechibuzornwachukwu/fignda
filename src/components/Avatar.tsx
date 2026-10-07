import { createElement, useMemo, useSyncExternalStore } from 'react';
import { avatarFor, drawAvatar, parseAvatar, VIEW_BOX, type Avatar as AvatarParts } from '../avatar/draw';
import { avatarCodeOf, subscribeAvatars } from '../avatar/store';
import styles from './Avatar.module.css';

type Props = {
  /** Whose avatar. Looks up their design; draws a starter from the handle until it is known. */
  handle?: string;
  /** Draw these parts directly (the designer preview). */
  parts?: AvatarParts;
  /** Square size in px. */
  size?: number;
  /** A close-up: an SVG viewBox onto part of the drawing (the editor zooms in on the face or the outfit). */
  view?: string;
  /** A rounded square instead of a circle (editor tiles). */
  tile?: boolean;
  className?: string;
};

/** A player's character. Drawn from shapes; decorative, the name next to it carries the meaning. */
export function Avatar({ handle = '', parts, size = 28, view, tile, className }: Props) {
  const code = useSyncExternalStore(
    subscribeAvatars,
    () => (parts || !handle ? null : avatarCodeOf(handle)),
    () => null,
  );
  const shapes = useMemo(() => drawAvatar(parts ?? (code ? parseAvatar(code) : avatarFor(handle))), [parts, code, handle]);
  return (
    <svg className={[tile ? styles.tile : styles.avatar, className].filter(Boolean).join(' ')} width={size} height={size} viewBox={view ?? VIEW_BOX} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {shapes.map((s, i) => createElement(s.tag, { key: i, ...toProps(s.attrs) }))}
    </svg>
  );
}

/** SVG attribute names to React prop names (stroke-width to strokeWidth). */
function toProps(attrs: Record<string, string | number>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(attrs)) out[k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  return out;
}

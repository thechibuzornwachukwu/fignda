import { createElement, useMemo } from 'react';
import { drawAvatar, shapeProps, VIEW_BOX, type Avatar as AvatarParts } from '../avatar/draw';
import styles from './Avatar.module.css';

/** A suspect's face, drawn from shapes. Decorative: the name beside it carries the meaning. */
export function Avatar({ parts, size = 28, className }: { parts: AvatarParts; size?: number; className?: string }) {
  const shapes = useMemo(() => drawAvatar(parts), [parts]);
  return (
    <svg className={[styles.avatar, className].filter(Boolean).join(' ')} width={size} height={size} viewBox={VIEW_BOX} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {shapes.map((s, i) => createElement(s.tag, { key: i, ...shapeProps(s.attrs) }))}
    </svg>
  );
}

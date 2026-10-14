import type { Ref } from 'react';
import type { Avatar as AvatarParts } from '../avatar/draw';
import type { Medal } from '../lib/medals';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { MedalFace } from './Medals';
import styles from './MedalCard.module.css';

export const MEDAL_CARD = 1080;

type Props = {
  medal: Medal;
  /** Whose medal: their name, and their detective drawn beside it. */
  name: string;
  handle?: string;
  parts?: AvatarParts;
  /** The link printed at the foot, host and path. */
  link: string;
  ref?: Ref<HTMLDivElement>;
};

/**
 * A medal shared as a picture (BUILD_PLAN set 9): 1080 square, drawn as the share cards are. The medal large in
 * its metal, the player's detective beside it, their name, the medal's name, and the link. Nothing explains it.
 */
export function MedalCard({ medal, name, handle, parts, link, ref }: Props) {
  return (
    <div ref={ref} className={styles.card} data-medal-card={medal.key} style={{ width: MEDAL_CARD, height: MEDAL_CARD }}>
      <Logo height={52} />
      <div className={styles.stage}>
        <span className={styles.medal}>
          <MedalFace medal={medal} size="lg" />
        </span>
        <Avatar handle={handle} parts={parts} size={300} className={styles.face} />
      </div>
      <div className={styles.words}>
        <span className={styles.name}>{name}</span>
        <span className={styles.title}>{medal.name}</span>
      </div>
      <span className={styles.link}>{link}</span>
    </div>
  );
}

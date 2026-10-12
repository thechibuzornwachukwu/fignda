import type { CSSProperties } from 'react';
import { Clock, Eye, Image, Map, Search, type LucideIcon } from 'lucide-react';
import { avatarFor } from '../avatar/draw';
import { roleLabel, type Chapter, type Pin, type PinKind } from '../engine/chapter';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import styles from './CaseBoard.module.css';

type Props = {
  chapter: Chapter;
  /** Steps solved so far. Each has pinned its few words to the board. */
  solved?: number;
  /** Suspects ruled out, by role. */
  cleared?: readonly string[];
  className?: string;
};

/** How many faces sit side by side on a phone: 4 are 2 by 2, 5 are 3 and 2. */
const facesAcross = (n: number): number => (n <= 3 ? n : n === 4 ? 2 : 3);

const ICONS: Partial<Record<PinKind, LucideIcon>> = { item: Search, map: Map, photo: Image, alibi: Clock };

/**
 * A case board (SPEC section 6, Brief): a pinboard laid out from the chapter's own data, so no 2 cases open alike.
 * It opens nearly empty and gains a pin for each step solved. 1 to 5 suspects, and a name never widens the board.
 */
export function CaseBoard({ chapter, solved = 0, cleared = [], className }: Props) {
  const suspects = chapter.suspects;
  const finds = chapter.steps.slice(0, Math.max(0, solved)).flatMap((s) => (s.pin ? [s.pin] : []));
  const label = `The case board. ${chapter.item.name}. ${suspects.length === 1 ? '1 suspect' : `${suspects.length} suspects`}. ${finds.length === 1 ? '1 find' : `${finds.length} finds`}.`;

  const body = (p: Pin) => {
    if (p.kind === 'note')
      return (
        <>
          <span className={styles.noteTitle}>{p.title}</span>
          {p.lines?.map((l) => (
            <span key={l} className={styles.noteLine}>
              {l}
            </span>
          ))}
        </>
      );
    if (p.kind === 'left')
      return (
        <span className={styles.left} role="img" aria-label={`Left behind: ${p.label}`}>
          <Icon icon={Eye} size={20} />
        </span>
      );
    if (p.kind === 'faces')
      return (
        <ul className={styles.faces} style={{ '--faces': suspects.length, '--rows-of': facesAcross(suspects.length) } as CSSProperties} data-faces>
          {suspects.map((s) => {
            const out = cleared.includes(s.who);
            return (
              <li key={s.who} className={styles.face} data-face data-cleared={out || undefined}>
                <span className={styles.portrait}>
                  <Avatar parts={avatarFor(`${chapter.id}~${s.who}`)} size={56} />
                </span>
                <span className={styles.name} title={s.name}>
                  {s.name}
                </span>
                <span className={styles.role} title={roleLabel(s.who)}>
                  {roleLabel(s.who)}
                </span>
                {out && <span className={styles.tape}>Cleared</span>}
              </li>
            );
          })}
        </ul>
      );
    const glyph = ICONS[p.kind];
    return (
      <>
        {glyph && (
          <span className={styles.picture}>
            <Icon icon={glyph} size={20} />
          </span>
        )}
        <span className={styles.caption}>{p.label}</span>
      </>
    );
  };

  return (
    <section className={[styles.board, className].filter(Boolean).join(' ')} aria-label={label} data-case-board data-suspects={suspects.length}>
      <ul className={styles.pins}>
        {chapter.board.pins.map((p, i) => (
          <li key={i} className={styles.pin} data-kind={p.kind}>
            {body(p)}
          </li>
        ))}
      </ul>
      {!!chapter.board.scrawl?.length && <p className={styles.scrawl}>{chapter.board.scrawl.join(' ')}</p>}
      {finds.length > 0 && (
        <ol className={styles.finds} aria-label="Found so far">
          {finds.map((f) => (
            <li key={f} className={styles.find} data-find>
              {f}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

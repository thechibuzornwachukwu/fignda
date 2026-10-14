import { useMemo } from 'react';
import { Button } from '../components/Button';
import { CaseBoard } from '../components/CaseBoard';
import { GAME_NAME } from '../components/Header';
import { TextLink } from '../components/TextLink';
import { chapters } from '../games/chapters';
import { loadChapterStars } from '../lib/chapterStore';
import { openCase } from '../lib/firstCase';
import { chapterProgress } from '../engine/chapter';
import { playNext } from '../lib/playNext';
import styles from './Landing.module.css';

/**
 * /. The game in 1 look: its name, the board of the case that is open as far as this player has filled it, and 1
 * way in. A new player is 1 tap from the first brief.
 */
export function Landing() {
  const play = useMemo(() => playNext(), []);
  const open = useMemo(() => openCase(), []);
  const chapter = open?.chapter ?? chapters[0];
  const progress = useMemo(() => (chapter ? chapterProgress(chapter, loadChapterStars(chapter.id)) : null), [chapter]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.name}>{GAME_NAME}</h1>
        <p className={styles.line}>8 cases on 1 street. Something is hidden in plain sight.</p>
        <Button variant="accent" to={play.to}>
          {play.kind === 'done' ? 'See your cases' : play.name}
        </Button>
        {play.kind !== 'done' && <TextLink to="/cases">All the cases</TextLink>}
      </section>
      {chapter && progress && (
        <section className={styles.board} aria-label={chapter.title}>
          <h2 className={styles.title}>{chapter.title}</h2>
          <CaseBoard chapter={chapter} solved={progress.solved} cleared={progress.cleared} />
        </section>
      )}
    </div>
  );
}

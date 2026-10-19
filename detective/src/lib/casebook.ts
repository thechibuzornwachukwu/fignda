import { chapterProgress } from '../engine/chapter';
import { chapters } from '../games/chapters';
import { loadChapterStars } from './chapterStore';
import { caseClosed, coldSealed } from './cold';

/** Each case and where the player stands with it: the first case not closed is the one being worked, every case after it is shut. */
export function casebookRows() {
  const at = chapters.findIndex((c) => !caseClosed(c));
  return chapters.map((chapter, n) => {
    const closed = caseClosed(chapter);
    const state = closed ? ('closed' as const) : n === at ? ('open' as const) : ('locked' as const);
    return { chapter, state, sealed: closed && coldSealed(chapter), solved: chapterProgress(chapter, loadChapterStars(chapter.id)).solved };
  });
}

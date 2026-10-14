// The written chapter a player is in, or is about to open (BUILD_PLAN set 1g). A new player lands in its brief,
// and a player who left it half way finds it again on the landing page and on Cases.

import { chapterProgress, type Chapter } from '../engine/chapter';
import { chapters } from '../games/chapters';
import { loadChapterStars } from './chapterStore';
import { caseClosed } from './cold';

export type OpenCase = {
  chapter: Chapter;
  /** The brief. The step that is open is one tap from it. */
  to: string;
  /** Steps finished so far. */
  solved: number;
  started: boolean;
};

/** A case is open when every case before it in the casebook is closed. Nothing is gated by a date. */
export function caseOpen(chapter: Chapter): boolean {
  return chapters.slice(0, Math.max(0, chapters.findIndex((c) => c.id === chapter.id))).every(caseClosed);
}

/** The first written chapter that is not closed yet. None: every chapter is closed, or none is written. */
export function openCase(): OpenCase | null {
  for (const chapter of chapters) {
    const stars = loadChapterStars(chapter.id);
    if ((stars[chapter.steps.length] ?? 0) > 0) continue;
    const { solved } = chapterProgress(chapter, stars);
    return { chapter, to: `/case/${chapter.id}`, solved, started: solved > 0 };
  }
  return null;
}

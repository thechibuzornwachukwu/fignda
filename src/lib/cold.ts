// Cold cases (BUILD_PLAN, How the cases are structured): a closed case worked again with no tip-offs, for a gold
// seal. The same screens at /cold/ID, with stars of their own kept in this browser beside the case's.

import { useLocation } from 'react-router-dom';
import type { Chapter } from '../engine/chapter';
import { loadChapterStars } from './chapterStore';

/** What a cold case's stars are kept under. No chapter id can hold a "~". */
export const coldId = (id: string): string => `cold~${id}`;

/** A chapter is closed once its last step is done, whatever that step is. */
export const caseClosed = (chapter: Chapter): boolean => (loadChapterStars(chapter.id)[chapter.steps.length] ?? 0) > 0;

/** The gold seal: every step of the case done again, cold. Steps open in order, so the last one says it. */
export const coldSealed = (chapter: Chapter): boolean => (loadChapterStars(coldId(chapter.id))[chapter.steps.length] ?? 0) > 0;

export type CaseWay = {
  /** Worked again, with no tip-offs, nothing sent and nothing counted against a guest. */
  cold: boolean;
  /** What this run's stars are kept under. */
  sid: string;
  /** Where its brief is. Its steps are under it. */
  base: string;
};

export const caseWay = (id: string, cold: boolean): CaseWay => ({ cold, sid: cold ? coldId(id) : id, base: `/${cold ? 'cold' : 'case'}/${id}` });

/** Whether this screen is a cold case, from its address. */
export const useCold = (): boolean => useLocation().pathname.startsWith('/cold/');

export const useCase = (id: string): CaseWay => caseWay(id, useCold());

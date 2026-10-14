import type { Chapter } from '../engine/chapter';

/** "The bakery" after "Go to": "the bakery". A name keeps its capital: "Rosa's night stall". */
export const toPlace = (place: string): string => (/^The /.test(place) ? `the ${place.slice(4)}` : place);

/** The words on the way on from step `at`, counted from 1: the next place, or what the case closes on. */
export function wayOn(chapter: Chapter, at: number): string {
  const next = chapter.steps[at];
  if (next?.method === 'line-up') return 'To the line-up';
  if (next?.method === 'accounts') return 'Weigh the accounts';
  return `Go to ${toPlace(chapter.steps[at - 1]?.to ?? '')}`;
}

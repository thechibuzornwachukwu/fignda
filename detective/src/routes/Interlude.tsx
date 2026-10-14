import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { stepPuzzle } from '../engine/chapter';
import { interludeChapter } from '../engine/interlude';
import { chapters, getInterlude } from '../games/chapters';
import { caseClosed } from '../lib/cold';
import { Play } from './Step';

/**
 * /interlude/:id. A message to the Open Eye, intercepted between 2 cases (SPEC section 6, Interlude): 1 sitting
 * on 1 board, played as a step is, ending on what it says. It opens when the case before it is closed.
 */
export function Interlude() {
  const { id = '' } = useParams();
  const it = getInterlude(id);
  const chapter = useMemo(() => (it ? interludeChapter(it) : undefined), [it]);
  const before = it && chapters.find((c) => c.number === it.after);
  const def = chapter && stepPuzzle(chapter, 1);
  if (!chapter || !def || !before || !caseClosed(before)) return <Navigate to="/cases" replace />;
  return <Play chapter={chapter} at={1} def={def} solved={0} alone={{ back: '/cases', backLabel: 'Cases', on: '/cases', onLabel: 'Back to cases' }} />;
}

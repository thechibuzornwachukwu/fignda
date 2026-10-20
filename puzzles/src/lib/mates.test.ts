import { MATE_COLOURS, mateSlots } from './mates';

describe('teammate colours', () => {
  it('first come first, a name keeps its colour, and the 7th starts the list again', () => {
    const s = mateSlots(['Ada', 'Bo', 'Ada', '', 'Cy', 'D', 'E', 'F', 'G']);
    expect([...s.entries()]).toEqual([['Ada', 1], ['Bo', 2], ['Cy', 3], ['D', 4], ['E', 5], ['F', 6], ['G', 1]]);
    expect(MATE_COLOURS).toBe(6);
  });
});

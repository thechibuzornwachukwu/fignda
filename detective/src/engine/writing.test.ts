import { readFileSync } from 'node:fs';
import pools from '../../data/copy.json';
import { checkChapter, pieceStars, pieceWrongs, piecesOf, talkStars, talkWrongs, TALK_TRIES, type Chapter } from './chapter';

const ember = (): Chapter => JSON.parse(readFileSync('design/stories/the-ember-award.json', 'utf8')) as Chapter;
const roles = pools.culpritWho;

describe('a case still being written', () => {
  it('plays as far as it goes, with no culprit, closer or ending yet', () => {
    expect(checkChapter(ember(), roles)).toEqual([]);
  });

  it('is held to the whole rules once it says it is finished', () => {
    const problems = checkChapter({ ...ember(), writing: false }, roles);
    expect(problems).toContain('the culprit is not one of the suspects');
    expect(problems).toContain('the ending needs what was found, a confession and what came after');
  });

  it('still leads on from its last written step, to a place still being written', () => {
    const c = ember();
    delete c.steps[2]!.to;
    expect(checkChapter(c, roles)).toContain("step 3: its lead does not go to the next step's place");
  });
});

describe('piece it together', () => {
  const c = ember();
  const p = piecesOf(c, 1)!;

  it('hands the pieces out of order, the same every time', () => {
    expect(p.count).toBe(6);
    expect([...p.deal].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(p.deal).not.toEqual([0, 1, 2, 3, 4, 5]);
    expect(piecesOf(c, 1)).toEqual(p);
  });

  it('counts the pieces set wrong, 1 pick a place', () => {
    expect(pieceWrongs(p, p.order)).toBe(0);
    const swapped = [...p.order];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    expect(pieceWrongs(p, swapped)).toBe(2);
    expect(pieceWrongs(p, p.order.slice(1))).toBe(-1);
    expect([pieceStars(0), pieceStars(1), pieceStars(2)]).toEqual([3, 2, 1]);
  });
});

describe('question them', () => {
  const talk = ember().steps[2]!.talk!;
  // 2 questions, then the pins of steps 1 and 2. The pin of step 2 makes him say more.
  const right = 2 + 1;

  it('costs nothing to ask what has a reason, and ends on the right pin', () => {
    expect(talkWrongs(talk, 2, [1, right])).toBe(0);
    expect(talkWrongs(talk, 2, [right])).toBe(0);
  });

  it('counts a talk ended and a pin that proves nothing as wrong moves', () => {
    expect(talkWrongs(talk, 2, [0, right])).toBe(1);
    expect(talkWrongs(talk, 2, [0, 2, right])).toBe(2);
    // Out of tries: he says it anyway.
    expect(talkWrongs(talk, 2, [0, 2])).toBe(TALK_TRIES);
    expect([talkStars(0), talkStars(1), talkStars(2)]).toEqual([3, 2, 1]);
  });

  it('refuses moves nobody could have made', () => {
    expect(talkWrongs(talk, 2, [])).toBe(-1);
    expect(talkWrongs(talk, 2, [right, 1])).toBe(-1);
    expect(talkWrongs(talk, 2, [1, 1, right])).toBe(-1);
    expect(talkWrongs(talk, 2, [9])).toBe(-1);
    expect(talkWrongs(talk, 2, [1])).toBe(-1);
  });
});

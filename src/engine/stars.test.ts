import { starsFor } from './stars';

const base = { finished: true, found: 10, total: 10, hints: 0, wrongs: 0 };

describe('starsFor', () => {
  it('is 0 when not finished, however much was found', () => {
    expect(starsFor({ ...base, finished: false })).toBe(0);
  });
  it('3 for a clean read', () => {
    expect(starsFor(base)).toBe(3);
  });
  it('a hint, a wrong pick or a teammate find drops a full find to 2', () => {
    expect(starsFor({ ...base, hints: 1 })).toBe(2);
    expect(starsFor({ ...base, wrongs: 1 })).toBe(2);
    expect(starsFor({ ...base, byOthers: true })).toBe(2);
  });
  it('80% is the line for 2', () => {
    expect(starsFor({ ...base, found: 8 })).toBe(2);
    expect(starsFor({ ...base, found: 7 })).toBe(1);
    expect(starsFor({ ...base, found: 4, total: 5 })).toBe(2);
  });
  it('finishing with nothing found is 1, and an empty puzzle never gives 3', () => {
    expect(starsFor({ ...base, found: 0 })).toBe(1);
    expect(starsFor({ ...base, found: 0, total: 0 })).toBe(1);
  });
});

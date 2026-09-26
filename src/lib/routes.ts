/** Puzzle screens: they carry their own bottom bar and an All games link. */
export const isPuzzle = (p: string) => /^\/(play\/[^/]+|d\/\d+|p\/[^/]+)\/?$/.test(p);

/** Pages with the phone tab bar: the app, not the landing pitch, not puzzles, not test harnesses. */
export const hasTabBar = (p: string) => p !== '/' && !isPuzzle(p) && !p.startsWith('/__');

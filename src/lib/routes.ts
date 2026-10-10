/** Puzzle screens: they carry their own bottom bar and an All games link. */
export const isPuzzle = (p: string) => /^\/(play\/[^/]+(\/\d+)?|d\/\d+|p\/[^/]+)\/?$/.test(p);

/** The first minute: one question per screen, and no way out but Skip. */
export const isWelcome = (p: string) => /^\/welcome\/?$/.test(p);

/** Pages with the phone tab bar: the app, not the landing pitch, not puzzles, not the first minute, not test harnesses. */
export const hasTabBar = (p: string) => p !== '/' && !isPuzzle(p) && !isWelcome(p) && !p.startsWith('/__');

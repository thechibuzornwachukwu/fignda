/** Puzzle screens, and a step of a written case: they carry their own bottom bar and their own way back. */
export const isPuzzle = (p: string) => /^\/(play\/[^/]+(\/\d+)?|d\/\d+|p\/[^/]+|case\/[^/]+\/\d+)\/?$/.test(p);

/** The first minute: one question per screen, and no way out but Skip. */
export const isWelcome = (p: string) => /^\/welcome\/?$/.test(p);

/** Pages with the phone tab bar: the app, not the landing pitch, not puzzles, not the first minute, not test harnesses. */
export const hasTabBar = (p: string) => p !== '/' && !isPuzzle(p) && !isWelcome(p) && !p.startsWith('/__');

/** A step of a case or an interlude: it has the whole screen, and its own way back. */
export const isStep = (p: string) => /^\/((case|cold)\/[^/]+\/\d+|interlude\/[^/]+)\/?$/.test(p);

/** Pages with the phone dock: the app, not the landing page, not a step, not a test harness. */
export const hasTabBar = (p: string) => p !== '/' && !isStep(p) && !p.startsWith('/__');

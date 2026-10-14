// The drawn rooms a case can be searched in (BUILD_PLAN set 1i-c). Each is drawn in design/sketches, in the look
// every room shares, and copied here as the svg the game shows. A test keeps the 2 the same.

import hall from './the-hall.svg';

export const SCENES: Readonly<Record<string, string>> = { 'the-hall': hall };

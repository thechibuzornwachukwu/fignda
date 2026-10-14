// The detective pieces among the parts. A suspect is an ordinary person on the street, so a face drawn by chance
// never wears one: no badge, no glass, no detective hat or coat.

/** The pieces, by the part they belong to and their name there. Append only, like the parts. */
export const EARNED: ReadonlyArray<{ part: 'kit' | 'outfit'; name: string }> = [
  { part: 'kit', name: 'badge' },
  { part: 'kit', name: 'magnifying glass' },
  { part: 'kit', name: 'detective hat' },
  { part: 'kit', name: 'full kit' },
  { part: 'outfit', name: 'detective coat' },
];

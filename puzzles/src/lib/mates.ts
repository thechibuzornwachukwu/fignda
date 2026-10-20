// Colours for the people in a room, the way a group chat colours names: your finds stay lime, and each
// teammate gets their own colour, in the order they came in. Pure.

/** How many teammate colours there are (`--mate-1` to `--mate-6`). A 7th teammate starts the list again. */
export const MATE_COLOURS = 6;

/** Each name's colour, 1 to 6, first come first. Names repeated keep their first colour. */
export function mateSlots(names: readonly string[]): Map<string, number> {
  const slots = new Map<string, number>();
  for (const n of names) if (n && !slots.has(n)) slots.set(n, (slots.size % MATE_COLOURS) + 1);
  return slots;
}

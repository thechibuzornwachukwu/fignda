// Each pack is drawn in its own colour (SPEC section 1, tokens `--pack-*`): one per category, so the path reads
// as a row of distinct things and a puzzle carries its pack's colour. A category with no hue of its own gets
// --pack-other.

const KNOWN = new Set(['naija', 'football', 'general', 'science', 'ai', 'health', 'bible', 'names', 'history']);

/** The CSS colour of a pack, from its category. */
export function packHue(category: string | undefined): string {
  const slug = (category ?? '').toLowerCase();
  return `var(--pack-${KNOWN.has(slug) ? slug : 'other'})`;
}

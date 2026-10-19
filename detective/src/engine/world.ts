// Lantern Row as places (design/WORLD.md), each with its spot on the map of the street (design/sketches/the-street.html,
// 1200 by 800). A case and each of its steps name a place here, and checkChapter refuses one that does not, so no story
// happens off the street. A place too far to walk to sits at an edge of the map, where its road leaves.
// Pure: data and nothing else. A test keeps every spot the same as the drawing's.

export const MAP_W = 1200;
export const MAP_H = 800;

export const PLACES = {
  street: { name: 'The street', at: [560, 470] },
  'bus-stop': { name: 'The bus stop', at: [110, 542] },
  'tea-kiosk': { name: 'The tea kiosk', at: [202, 547] },
  hall: { name: 'The hall', at: [330, 250] },
  'store-room': { name: 'The store room', at: [225, 190] },
  'committee-room': { name: 'The committee room', at: [420, 195] },
  'caretaker-desk': { name: "The caretaker's desk", at: [454, 390] },
  'side-door': { name: 'The side door', at: [180, 305] },
  'notice-board': { name: 'The notice board', at: [250, 409] },
  yard: { name: 'The yard', at: [670, 95] },
  alley: { name: 'The alley', at: [160, 330] },
  library: { name: 'The library', at: [480, 645] },
  bakery: { name: 'The bakery', at: [610, 300] },
  'art-room': { name: 'The art room', at: [610, 220] },
  'sale-room': { name: 'The sale room', at: [785, 295] },
  houses: { name: 'The houses', at: [760, 615] },
  'market-row': { name: 'The market row', at: [1020, 470] },
  'watchman-hut': { name: "The watchman's hut", at: [1133, 643] },
  depot: { name: 'The depot', at: [24, 470], edge: 'west' },
  'night-stall': { name: "Rosa's night stall", at: [1176, 455], edge: 'east' },
  'secretary-house': { name: "The secretary's house", at: [1176, 490], edge: 'east' },
} as const satisfies Record<string, { name: string; at: readonly [number, number]; edge?: 'west' | 'east' }>;

export type PlaceId = keyof typeof PLACES;
export const PLACE_IDS = Object.keys(PLACES) as PlaceId[];
export const isPlace = (v: unknown): v is PlaceId => typeof v === 'string' && Object.hasOwn(PLACES, v);

/**
 * Where a season dresses the map (BUILD_PLAN, seasonal cases): snow lies on the roofs, a pumpkin waits by a door,
 * lights hang from the lamps. Each is a shape in the drawing carrying `data-anchor`, so a season is a layer laid on
 * these and the street is never redrawn.
 */
export const ANCHORS = [
  'roof-hall', 'roof-bakery', 'roof-sale-room', 'roof-library', 'roof-houses',
  'door-hall', 'door-bakery', 'door-sale-room', 'door-library',
  'tree-plane-1', 'tree-plane-2', 'tree-lime',
  'lamp-1', 'lamp-2', 'lamp-3', 'lamp-4', 'lamp-5', 'lamp-6', 'lamp-7', 'lamp-8',
  'awning-1', 'awning-2', 'awning-3', 'awning-4', 'awning-5', 'awning-6', 'awning-7', 'awning-8',
  'market-square',
  // Open sky over the rooftops, for what flies or hangs in the air: bats at Halloween, lanterns at New Year.
  'sky-1', 'sky-2', 'sky-3',
] as const;

// Lantern Row as places (design/WORLD.md), each with its spot on the plan of the street (src/map/street.ts,
// 1200 by 800, drawn in 3D by src/map3d). A case and each of its steps name a place here, and checkChapter refuses one that does not, so no story
// happens off the street. A place too far to walk to sits at an edge of the map, where its road leaves.
// Pure: data and nothing else. A test keeps every spot on the plan.

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

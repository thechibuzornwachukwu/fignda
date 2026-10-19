// 12 topic icons of our own, for home subjects lucide does not draw (BUILD_PLAN set 7o). Drawn on lucide's 24
// grid with its round caps and joins, so they sit beside lucide's own and go through the same <Icon> wrapper.

import { createLucideIcon } from 'lucide-react';

type Node = Parameters<typeof createLucideIcon>[1];
const icon = (name: string, nodes: Array<[string, Record<string, string | number>]>) =>
  createLucideIcon(name, nodes.map(([tag, attrs], i) => [tag, { ...attrs, key: `${name}-${i}` }]) as Node);

/** Jollof, soup, stew: a pot with steam. */
export const Pot = icon('Pot', [
  ['path', { d: 'M4 11h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z' }],
  ['path', { d: 'M2 11h2M20 11h2' }],
  ['path', { d: 'M9 3c-1 1 1 2 0 3M13 3c-1 1 1 2 0 3' }],
]);
/** Market: a stall with a scalloped awning. */
export const Stall = icon('Stall', [
  ['path', { d: 'M3 8l2-4h14l2 4' }],
  ['path', { d: 'M3 8a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0' }],
  ['path', { d: 'M5 11v9h14v-9M10 20v-5h4v5' }],
]);
/** Talking drum: an hourglass drum with its cords. */
export const Drum = icon('Drum', [
  ['ellipse', { cx: 12, cy: 4, rx: 5, ry: 2 }],
  ['ellipse', { cx: 12, cy: 20, rx: 5, ry: 2 }],
  ['path', { d: 'M7 4c2 4 2 12 0 16M17 4c-2 4-2 12 0 16' }],
  ['path', { d: 'M9.5 5.5l5 13M14.5 5.5l-5 13' }],
]);
/** Keke: a tricycle taxi. */
export const Keke = icon('Keke', [
  ['path', { d: 'M4 16V9a4 4 0 0 1 4-4h6l4 5v6' }],
  ['path', { d: 'M4 10h14' }],
  ['circle', { cx: 6.5, cy: 17.5, r: 2 }],
  ['circle', { cx: 17.5, cy: 17.5, r: 2 }],
  ['path', { d: 'M8.5 17.5h7' }],
]);
/** Danfo: a city bus, with its stripe. */
export const Danfo = icon('Danfo', [
  ['rect', { x: 3, y: 5, width: 18, height: 12, rx: 2 }],
  ['path', { d: 'M3 10h18M3 13h18' }],
  ['circle', { cx: 7, cy: 18.5, r: 1.5 }],
  ['circle', { cx: 17, cy: 18.5, r: 1.5 }],
]);
/** Pounded yam: a mortar and pestle. */
export const Mortar = icon('Mortar', [
  ['path', { d: 'M5 12h14l-2 6H7z' }],
  ['path', { d: 'M8 18l-1 3h10l-1-3' }],
  ['path', { d: 'M14 12l5-9' }],
]);
/** Gele: a tied head wrap, for weddings and parties. */
export const Gele = icon('Gele', [
  ['path', { d: 'M5 13c0-5 3-8 7-8s7 3 7 8' }],
  ['path', { d: 'M4 13h16' }],
  ['path', { d: 'M12 5c-2-2-5-2-6 0M12 5c2-2 5-2 6 0' }],
  ['path', { d: 'M8 13v3a4 4 0 0 0 8 0v-3' }],
]);
/** Calabash: a gourd bowl, for palm wine. */
export const Calabash = icon('Calabash', [
  ['path', { d: 'M3 11h18a9 9 0 0 1-18 0z' }],
  ['path', { d: 'M7 15h10' }],
  ['path', { d: 'M12 11V7a2 2 0 0 1 2-2' }],
]);
/** Plantain: a curved fruit. */
export const Plantain = icon('Plantain', [
  ['path', { d: 'M4 6c1 8 6 13 15 13' }],
  ['path', { d: 'M4 6c3 5 8 8 15 9' }],
  ['path', { d: 'M3 5l2-1M19 15v4' }],
]);
/** Generator: a box with a handle and a plug. */
export const Generator = icon('Generator', [
  ['rect', { x: 3, y: 8, width: 14, height: 11, rx: 2 }],
  ['path', { d: 'M6 8V5h8v3' }],
  ['path', { d: 'M10 11l-2 3h4l-2 3' }],
  ['path', { d: 'M17 13h2a2 2 0 0 1 2 2v2' }],
]);
/** Agbada: a wide robe with its sleeves out. */
export const Agbada = icon('Agbada', [
  ['path', { d: 'M9 4h6l7 6-3 2-2-2v10H7V10l-2 2-3-2z' }],
  ['path', { d: 'M10 4l2 4 2-4' }],
]);
/** Mosque: a dome, a crescent and a minaret. */
export const Mosque = icon('Mosque', [
  ['path', { d: 'M5 20v-6a5 5 0 0 1 10 0v6' }],
  ['path', { d: 'M3 20h18' }],
  ['path', { d: 'M19 20V9M18 9h2l-1-3z' }],
  ['path', { d: 'M10 6.5a1.5 1.5 0 1 0 1.5-2' }],
]);

export const HOME_ICONS = { Pot, Stall, Drum, Keke, Danfo, Mortar, Gele, Calabash, Plantain, Generator, Agbada, Mosque } as const;

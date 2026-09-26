// Share delivery: PNG export at the card's real size, Web Share with files, download fallback, copy link.

import { toBlob } from 'html-to-image';

/** Public link for a game. Daily and custom games have their own short routes. */
export function sharePath(g: { id: string; daily?: number; code?: string }): string {
  if (g.daily) return `/d/${g.daily}`;
  if (g.code) return `/p/${g.code}`;
  return `/play/${g.id}`;
}

export const shareUrl = (path: string) => `${window.location.origin}${path}`;
/** The link as printed on cards: host and path, no protocol. */
export const shareUrlLabel = (path: string) => `${window.location.host}${path}`;

/** Render one full-size card node to a PNG file of exactly width x height. */
export async function cardToFile(node: HTMLElement, width: number, height: number, name: string): Promise<File> {
  await document.fonts.ready;
  const blob = await toBlob(node, { width, height, pixelRatio: 1, cacheBust: true });
  if (!blob) throw new Error('export_failed');
  return new File([blob], name, { type: 'image/png' });
}

export type Delivered = 'shared' | 'saved' | 'cancelled';

/** Web Share with files where the device supports it; otherwise download each file. */
export async function deliver(files: File[], text: string, url: string): Promise<Delivered> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files }) && nav.share) {
    try {
      await nav.share({ files, text: `${text}\n${url}` });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Fall through to download.
    }
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }
  return 'saved';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

import { useEffect, useState, type RefObject } from 'react';

/** Scroll this far in one direction before a bar moves. Stops jitter from small wobbles. */
const TOLERANCE = 8;

/**
 * Quick return (Material "enterAlways", headroom.js): hide on scroll down, show on any scroll up.
 * Always shown near the top, and whenever focus is inside it so keyboard users never lose it.
 * `atEnd`: also shown at the very end of the page, for a bar at the bottom, so the last thing a reader
 * meets there is the way on.
 */
export function useTucked(ref: RefObject<HTMLElement | null>, pathname: string, atEnd = false) {
  const [tucked, setTucked] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setTucked(false);
  }

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const d = y - last;
      if (Math.abs(d) < TOLERANCE) return;
      const el = ref.current;
      const height = el?.offsetHeight ?? 0;
      const focused = !!el && el.contains(document.activeElement);
      const ended = atEnd && window.innerHeight + y >= document.documentElement.scrollHeight - TOLERANCE;
      setTucked(d > 0 && y > height && !focused && !ended);
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onFocus = () => setTucked(false);
    const el = ref.current;
    window.addEventListener('scroll', onScroll, { passive: true });
    el?.addEventListener('focusin', onFocus);
    return () => {
      window.removeEventListener('scroll', onScroll);
      el?.removeEventListener('focusin', onFocus);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, atEnd]);

  return tucked;
}

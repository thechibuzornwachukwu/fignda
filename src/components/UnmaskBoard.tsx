import { useEffect, useMemo, useRef } from "react";
import { ALPHABET, UNMASK_TRIES, unmaskSlots } from "../engine/unmask";
import { Culprit } from "./CaseFile";
import type { PuzzleProps } from "./Puzzle";
import styles from "./UnmaskBoard.module.css";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"] as const;

/**
 * The unmasking board: the culprit in disguise, the name as it stands, the tries left and a keyboard.
 * A pick is one letter, sent as its place in the alphabet. Typing a letter picks it too.
 */
export function UnmaskBoard({
  found,
  disabled,
  onPick,
  describedBy,
  text = "",
  picked = [],
  caseId = "",
}: PuzzleProps) {
  const hit = useMemo(() => new Set(found.map(([a]) => ALPHABET[a]!)), [found]);
  const tried = useMemo(
    () => new Set(picked.map((i) => ALPHABET[i]!)),
    [picked],
  );
  const wrong = [...tried].filter((ch) => !hit.has(ch));
  const left = Math.max(0, UNMASK_TRIES - wrong.length);
  const slots = unmaskSlots(text, hit);
  const total = new Set(
    [...text.toLowerCase()].filter((ch) => ALPHABET.includes(ch)),
  ).size;
  const lastWrong = wrong[wrong.length - 1] ?? "";

  // Latest values for the key listener, which is bound once.
  const live = useRef({ disabled, tried, onPick });
  useEffect(() => {
    live.current = { disabled, tried, onPick };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const i = ALPHABET.indexOf(e.key.toLowerCase());
      const t = e.target as HTMLElement | null;
      if (
        i < 0 ||
        live.current.disabled ||
        live.current.tried.has(ALPHABET[i]!) ||
        (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      )
        return;
      live.current.onPick(i, i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Words stay whole when the name wraps.
  const words: Array<Array<{ ch: string; at: number }>> = [[]];
  slots.forEach((ch, at) => {
    if (text[at] === " ") words.push([]);
    else words[words.length - 1]!.push({ ch, at });
  });

  return (
    <div className={styles.board} data-unmask data-left={left}>
      <div className={styles.stage}>
        {/* A wrong letter shakes the culprit once: the key changes, so the animation runs again. */}
        <span
          key={lastWrong}
          className={styles.suspect}
          data-shake={lastWrong ? "" : undefined}
        >
          <Culprit
            id={caseId}
            size={112}
            state="masked"
            off={total ? hit.size / total : 0}
          />
        </span>
        <p
          className={styles.tries}
          role="img"
          aria-label={left === 1 ? "1 try left" : `${left} tries left`}
        >
          {Array.from({ length: UNMASK_TRIES }, (_, i) => (
            <span
              key={i}
              className={styles.pip}
              data-spent={i >= left || undefined}
            />
          ))}
        </p>
      </div>

      <p
        className={styles.name}
        aria-label={`The culprit is the ${slots.map((ch) => ch || "blank").join(" ")}`}
      >
        <span className={styles.the}>The</span>
        {words.map((w, wi) => (
          <span key={wi} className={styles.word}>
            {w.map(({ ch, at }) =>
              /[a-z]/i.test(text[at]!) ? (
                <span
                  key={`${at}${ch}`}
                  className={styles.slot}
                  data-filled={ch ? "" : undefined}
                  data-slot
                >
                  {ch}
                </span>
              ) : (
                <span key={at} className={styles.given}>
                  {ch}
                </span>
              ),
            )}
          </span>
        ))}
      </p>

      <div
        className={styles.keys}
        role="group"
        aria-label="Letters"
        aria-describedby={describedBy}
      >
        {ROWS.map((row) => (
          <div key={row} className={styles.row}>
            {[...row].map((ch) => {
              const state = hit.has(ch)
                ? "hit"
                : tried.has(ch)
                  ? "miss"
                  : undefined;
              const i = ALPHABET.indexOf(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  className={styles.key}
                  data-key={ch}
                  data-state={state}
                  disabled={disabled || !!state}
                  aria-label={
                    state === "hit"
                      ? `${ch.toUpperCase()}, in the name`
                      : state === "miss"
                        ? `${ch.toUpperCase()}, not in the name`
                        : ch.toUpperCase()
                  }
                  onClick={() => onPick(i, i)}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { PageHeader } from "../components/PageHeader";
import {
  fetchHiddenPuzzles,
  removePuzzle,
  restorePuzzle,
  type HiddenPuzzle,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import styles from "./OwnerPuzzles.module.css";

type State =
  | { status: "loading" }
  | { status: "notyou" }
  | { status: "error" }
  | { status: "ready"; puzzles: HiddenPuzzle[] };

const SAFETY = {
  passed: "Safety check passed",
  failed: "Safety check failed",
  unchecked: "Not checked",
} as const;

/** "9 Oct 2026", or nothing when the date is missing or unreadable. Never "Invalid Date". */
function day(iso: unknown): string {
  const d = typeof iso === "string" ? new Date(iso) : null;
  return d && Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
}

/** /owner/puzzles. Puzzles hidden by reports, newest first, with Restore and Remove. Owners only, linked from nowhere. */
export function OwnerPuzzles() {
  const auth = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [removing, setRemoving] = useState<HiddenPuzzle | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (auth.loading) return;
    let alive = true;
    fetchHiddenPuzzles().then(
      // The API answers 404 to everyone who is not an owner, and null is what that looks like here.
      (list) =>
        alive &&
        setState(
          list
            ? { status: "ready", puzzles: list.filter((p) => p && p.code) }
            : { status: "notyou" },
        ),
      () => alive && setState({ status: "error" }),
    );
    return () => {
      alive = false;
    };
  }, [auth.loading, attempt]);

  if (!auth.enabled || state.status === "notyou")
    return <Navigate to="/" replace />;

  const act = async (p: HiddenPuzzle, kind: "restore" | "remove") => {
    setBusy(p.code);
    setNote("");
    const out = await (kind === "restore" ? restorePuzzle : removePuzzle)(
      p.code,
    );
    setBusy("");
    setRemoving(null);
    if (!out.ok) return setNote("That did not work. Try again in a moment.");
    setState((s) =>
      s.status === "ready"
        ? {
            status: "ready",
            puzzles: s.puzzles.filter((x) => x.code !== p.code),
          }
        : s,
    );
    setNote(
      kind === "restore"
        ? `Restored ${p.title?.trim() || p.code}.`
        : `Removed ${p.title?.trim() || p.code}.`,
    );
  };

  return (
    <div className={styles.page} aria-busy={state.status === "loading"}>
      <PageHeader title="Hidden puzzles" />
      <span className={styles.note} role="status">
        {note}
      </span>
      {state.status === "error" && (
        <section className={styles.empty}>
          <p className={styles.muted}>
            This list did not load. Try again in a moment.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        </section>
      )}
      {state.status === "ready" && state.puzzles.length === 0 && (
        <p className={styles.muted}>
          Nothing is hidden. Puzzles show up here when 3 players report them.
        </p>
      )}
      {state.status === "ready" && state.puzzles.length > 0 && (
        <ul className={styles.list}>
          {state.puzzles.map((p) => {
            const shown = day(p.hidden_at);
            const reports = Number.isFinite(p.reports) ? p.reports : 0;
            return (
              <li key={p.code} className={styles.row}>
                <div className={styles.main}>
                  <Link to={`/p/${p.code}`} className={styles.title}>
                    {p.title?.trim() || "Untitled puzzle"}
                  </Link>
                  <span className={styles.sub}>
                    {p.maker ? `@${p.maker}` : "No maker"} · {reports}{" "}
                    {reports === 1 ? "report" : "reports"} ·{" "}
                    {SAFETY[p.safety] ?? SAFETY.unchecked}
                    {shown && ` · Hidden ${shown}`}
                  </span>
                </div>
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => act(p, "restore")}
                    disabled={busy === p.code}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRemoving(p)}
                    disabled={busy === p.code}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={removing != null}
        onClose={() => !busy && setRemoving(null)}
        label="Remove puzzle"
      >
        <div className={styles.confirm}>
          <h2 className={styles.confirmTitle}>Remove this puzzle?</h2>
          <p className={styles.muted}>
            This deletes {removing?.title?.trim() || "it"} for good, with its
            plays and thumbs. It cannot be undone.
          </p>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => setRemoving(null)}
              disabled={busy !== ""}
            >
              Keep it
            </Button>
            <Button
              variant="primary"
              onClick={() => removing && act(removing, "remove")}
              disabled={busy !== ""}
            >
              Remove
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

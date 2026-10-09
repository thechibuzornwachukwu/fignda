import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { TextLink } from "../components/TextLink";
import { pick } from "../copy";
import {
  fetchPuzzleRating,
  ratePuzzle,
  reportPuzzle,
  type PuzzleRating,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import styles from "./GameResults.module.css";
import local from "./RatePuzzle.module.css";

/** Under the result of a player-made puzzle: who made it, and one thumb each from signed in players. */
export function RatePuzzle({ code }: { code: string }) {
  const auth = useAuth();
  const [r, setR] = useState<PuzzleRating | null>(null);
  const [mine, setMine] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  /** What the last report said. Shown in place of the link once it is sent. */
  const [said, setSaid] = useState("");

  useEffect(() => {
    let alive = true;
    fetchPuzzleRating(code).then((x) => {
      if (!alive || !x) return;
      setR(x);
      setMine(x.mine);
    });
    return () => {
      alive = false;
    };
  }, [code]);

  // Puzzles made from a topic have no maker and are not rated.
  if (!r || !r.maker) return null;
  const rate = (up: boolean) => {
    setMine(up);
    void ratePuzzle(code, up);
  };
  const report = async () => {
    setBusy(true);
    const out = await reportPuzzle(code);
    setBusy(false);
    setAsking(false);
    // Reported already counts as done. A failure leaves the link in place so it can be tried again.
    setSaid(
      out.ok
        ? pick(out.again ? "reportAgain" : "reportDone")
        : pick("reportFailed"),
    );
  };
  return (
    <div className={styles.rate}>
      <span className={styles.guestText}>
        Made by{" "}
        <Link to={`/u/${r.maker}`} className={styles.signin}>
          @{r.maker}
        </Link>
        .
        {r.own
          ? ` ${r.ups} liked it.`
          : auth.profile
            ? " Was it a good one?"
            : ""}
      </span>
      {!r.own && auth.profile && (
        <span className={styles.rateButtons}>
          <button
            type="button"
            className={styles.rateButton}
            aria-pressed={mine === true}
            onClick={() => rate(true)}
          >
            Good one
          </button>
          <button
            type="button"
            className={styles.rateButton}
            aria-pressed={mine === false}
            onClick={() => rate(false)}
          >
            Not for me
          </button>
        </span>
      )}
      {!r.own && auth.profile && (
        <>
          {said ? (
            <span className={local.said} role="status">
              {said}
            </span>
          ) : (
            <TextLink onClick={() => setAsking(true)}>
              Report this puzzle
            </TextLink>
          )}
          <Dialog
            open={asking}
            onClose={() => !busy && setAsking(false)}
            label="Report this puzzle"
          >
            <div className={local.confirm}>
              <h2 className={local.title}>Report this puzzle?</h2>
              <p className={local.help}>
                Tell us if it is rude, unsafe or not a real puzzle. A few
                reports hide it while we look.
              </p>
              <div className={local.row}>
                <Button
                  variant="secondary"
                  onClick={() => setAsking(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={report} disabled={busy}>
                  Report
                </Button>
              </div>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}

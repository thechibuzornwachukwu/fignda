import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Skeleton, SkeletonGroup, SkeletonList } from "../components/Skeleton";
import { TextLink } from "../components/TextLink";
import { dayNo } from "../engine/daily";
import { formatTime } from "../engine/time";
import { getGameDef } from "../games/catalog";
import { dailyDate } from "../games/daily";
import {
  fetchBadges,
  fetchPoints,
  fetchOwnPlays,
  fetchProfileByHandle,
  fetchPublicPlays,
  type PublicProfile,
} from "../lib/api";
import { BADGES } from "../lib/notifications";
import { useAuth } from "../lib/auth";
import { profileStats, type PlayRow } from "../lib/profileStats";
import { unlocks } from "../lib/unlocks";
import {
  SocialActions,
  SocialCounts,
  SocialLists,
  useSocial,
} from "./ProfileSocial";
import { Avatar } from "../components/Avatar";
import { LevelBadge } from "../components/LevelBadge";
import { BadgePills } from "./Yours";
import styles from "./Profile.module.css";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | {
      status: "ready";
      profile: PublicProfile;
      /** Null when the plays did not load. */ plays: PlayRow[] | null;
      badges: string[];
      /** Points as the server counts them, clues included. Null when they did not load. */ points: number | null;
    };

/** "Oct 2026", or nothing when the date is missing or unreadable. Never "Invalid Date". */
function monthYear(iso: unknown): string {
  const d = typeof iso === "string" ? new Date(iso) : null;
  return d && Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "";
}

function playTitle(p: PlayRow) {
  if (p.day_no != null) return `Daily #${p.day_no}`;
  if (p.game_id.startsWith("c-")) return "Custom puzzle";
  return getGameDef(p.game_id)?.title ?? "Puzzle";
}

function playSub(p: PlayRow) {
  if (p.day_no != null)
    return `${getGameDef(p.game_id)?.noun ?? ""} · ${dailyDate(p.day_no)}`;
  const g = getGameDef(p.game_id);
  return g ? g.category : "Made from a topic";
}

/** /u/:handle. A player's public page, and only that: what everyone sees. What is yours alone (records, badges to aim for, settings) is on You. */
export function Profile() {
  const { handle = "" } = useParams();
  const auth = useAuth();
  const own = auth.profile?.handle === handle;
  const [state, setState] = useState<State>({ status: "loading" });
  const [note, setNote] = useState("");
  const social = useSocial(handle);

  useEffect(() => {
    let alive = true;
    (async () => {
      // A page that did not load is not a player who does not exist.
      const profile = await fetchProfileByHandle(handle).catch(
        () => "failed" as const,
      );
      if (!alive) return;
      if (profile === "failed") return setState({ status: "error" });
      if (!profile) return setState({ status: "missing" });
      // Your own page counts every play of yours; everyone else sees verified plays only.
      const plays = await (own ? fetchOwnPlays() : fetchPublicPlays(handle)).then(
        (p) => (Array.isArray(p) ? p : []),
        () => null,
      );
      const badges = await fetchBadges(handle).then(
        (b) => (Array.isArray(b) ? b : []),
        () => [],
      );
      // Points as the server counts them, clues included. The plays above give a number if this fails.
      const points = await fetchPoints(handle).catch(() => null);
      if (alive) setState({ status: "ready", profile, plays, badges, points });
    })();
    return () => {
      alive = false;
    };
  }, [handle, own]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  const title = "Player";
  // Your own public page leads back to You, where everything about you is changed.
  const settings = own ? <TextLink to="/me">Back to You</TextLink> : undefined;
  if (state.status === "loading") {
    return (
      <div className={styles.page}>
        <PageHeader title={title} action={settings} />
        <SkeletonGroup className={styles.who}>
          <Skeleton width={88} height={88} round />
          <div className={styles.names}>
            <Skeleton width="40%" height={24} />
            <Skeleton width="56%" />
            <Skeleton width="32%" />
          </div>
        </SkeletonGroup>
        <SkeletonList rows={4} />
      </div>
    );
  }
  if (state.status === "missing" || state.status === "error") {
    return (
      <div className={styles.page}>
        <PageHeader title={title} action={settings} />
        <h2 className={styles.name}>
          {state.status === "missing"
            ? `No player called @${handle}.`
            : "This page did not load."}
        </h2>
        <p className={styles.muted}>
          {state.status === "missing"
            ? "Check the spelling, or find a puzzle instead."
            : "Try again in a moment, or find a puzzle instead."}
        </p>
        <div>
          <Button to="/play">Play</Button>
        </div>
      </div>
    );
  }

  const { profile, badges } = state;
  const playsFailed = state.plays == null;
  const plays = state.plays ?? [];
  const since = monthYear(profile.created_at);
  const name = profile.name || `@${profile.handle}`;
  const today = dayNo();
  const s = profileStats(plays, today);
  // Points and badges appear after the first verified play (src/lib/unlocks.ts). A link to #badges always shows them.
  const open = unlocks({
    finished: plays.length,
    plays: plays.length,
    dailies: s.dailies,
    verified: plays.filter((p) => p.verified !== false).length,
  });
  const cleanReads =
    Number.isFinite(s.cleanReads) && s.cleanReads > 0 ? s.cleanReads : 0;
  const hasBadges = BADGES.some((b) => badges.includes(b.code));
  const badgeList = hasBadges && (
    <section
      id="badges"
      className={styles.section}
      aria-labelledby="badges-title"
    >
      <h2 id="badges-title" className={styles.h2}>
        Badges
      </h2>
      <BadgePills codes={badges} />
    </section>
  );

  return (
    <div className={styles.page}>
      <PageHeader title={title} action={settings} />
      <div className={styles.who}>
        <Avatar handle={profile.handle} size={88} />
        <div className={styles.names}>
          <h2 className={styles.name}>{name}</h2>
          {open.points && <LevelBadge points={state.points ?? s.points} size="sm" />}
          <span className={styles.handle}>
            @{profile.handle}
            {since && ` · Playing since ${since}`}
          </span>
          <SocialCounts social={social} />
        </div>
        <SocialActions
          handle={profile.handle}
          name={name}
          own={own}
          social={social}
          onNote={setNote}
        />
      </div>
      <span className={styles.note} role="status">
        {note}
      </span>

      {playsFailed ? (
        <section className={styles.fresh} aria-label="Plays">
          <p className={styles.muted}>
            {own
              ? "Your plays did not load. Try again in a moment."
              : "Their plays did not load. Try again in a moment."}
          </p>
          {badgeList}
        </section>
      ) : plays.length === 0 ? (
        <section className={styles.fresh} aria-label="New player">
          <h2 className={styles.freshTitle}>
            {own ? "Your run starts with one puzzle." : `${name} is new here.`}
          </h2>
          <p className={styles.muted}>
            {own
              ? "Find one word and you are on the board. Points, streaks and your last 14 dailies will show up here as you play."
              : "No plays yet. Their points and streak will show up here after a first game."}
          </p>
          <div className={styles.freshActions}>
            {own ? (
              <Button variant="accent" to={`/d/${today}`}>
                Play today's daily
              </Button>
            ) : (
              <Button variant="secondary" to="/play">
                Find a puzzle
              </Button>
            )}
          </div>
        </section>
      ) : (
        <>
          {open.points && (
            <dl className={styles.points}>
              <dt className={styles.statLabel}>Points</dt>
              <dd className={styles.statValue}>
                {s.points.toLocaleString("en-US")}
              </dd>
            </dl>
          )}

          <dl className={styles.stats} data-count={cleanReads > 0 ? 5 : 4}>
            <div className={styles.stat}>
              <dt className={styles.statLabel}>Streak</dt>
              <dd className={styles.statValue}>
                {s.streak}
                <span className={styles.unit}>
                  {s.streak === 1 ? " day" : " days"}
                </span>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt className={styles.statLabel}>Best streak</dt>
              <dd className={styles.statValue}>
                {s.bestStreak}
                <span className={styles.unit}>
                  {s.bestStreak === 1 ? " day" : " days"}
                </span>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt className={styles.statLabel}>Dailies</dt>
              <dd className={styles.statValue}>{s.dailies}</dd>
            </div>
            <div className={styles.stat}>
              <dt className={styles.statLabel}>Perfect</dt>
              <dd className={styles.statValue}>{s.perfect}</dd>
            </div>
            {cleanReads > 0 && (
              <div className={styles.stat}>
                <dt className={styles.statLabel}>Clean reads</dt>
                <dd className={styles.statValue}>{cleanReads}</dd>
              </div>
            )}
          </dl>

          <section className={styles.section} aria-labelledby="days-title">
            <div className={styles.sectionHead}>
              <h2 id="days-title" className={styles.h2}>
                Last 14 dailies
              </h2>
              <span className={styles.legend}>
                <span className={styles.key} data-state="perfect" /> Every word
                <span className={styles.key} data-state="played" /> Played
              </span>
            </div>
            <ol className={styles.days}>
              {s.last14.map((c) => (
                <li
                  key={c.day}
                  className={styles.day}
                  data-state={c.state}
                  title={`${dailyDate(c.day)}: ${c.state === "none" ? "not played" : c.state === "perfect" ? "every word found" : "played"}`}
                >
                  <span className={styles.srOnly}>
                    {dailyDate(c.day)},{" "}
                    {c.state === "none"
                      ? "not played"
                      : c.state === "perfect"
                        ? "every word found"
                        : "played"}
                  </span>
                </li>
              ))}
            </ol>
            <div className={styles.dayScale} aria-hidden="true">
              <span>{dailyDate(today - 13)}</span>
              <span>Today</span>
            </div>
          </section>

          {badgeList}

          <section className={styles.section} aria-labelledby="recent-title">
            <h2 id="recent-title" className={styles.h2}>
              Recent
            </h2>
            {s.recent.length === 0 ? (
              <p className={styles.muted}>
                {own
                  ? "Nothing yet. "
                  : `@${profile.handle} has no verified plays yet. `}
                <Link to="/play" className={styles.inline}>
                  {own ? "Play today's daily" : "Find a puzzle"}
                </Link>
                .
              </p>
            ) : (
              <ul className={styles.recent}>
                {s.recent.map((p, i) => (
                  <li key={i} className={styles.row}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>{playTitle(p)}</span>
                      <span className={styles.rowSub}>
                        {playSub(p)}
                        {own && p.verified === false && " · Unverified"}
                      </span>
                    </div>
                    <span className={styles.rowFound}>
                      {p.total == null
                        ? `${p.found} found`
                        : `${p.found}/${p.total}`}
                    </span>
                    <span className={styles.rowTime}>{formatTime(p.secs)}</span>
                    <span className={styles.rowScore}>
                      {p.score.toLocaleString("en-US")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <SocialLists own={own} social={social} />
    </div>
  );
}

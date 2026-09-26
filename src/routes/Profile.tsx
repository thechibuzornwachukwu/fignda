import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { dayNo } from '../engine/daily';
import { formatTime } from '../engine/time';
import { getGameDef } from '../games/catalog';
import { dailyDate } from '../games/daily';
import { fetchOwnPlays, fetchProfileByHandle, fetchPublicPlays, type PublicProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { profileStats, type PlayRow } from '../lib/profileStats';
import { copyText } from '../lib/share';
import styles from './Profile.module.css';

type State = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; profile: PublicProfile; plays: PlayRow[] };

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

function playTitle(p: PlayRow) {
  if (p.day_no != null) return `Daily #${p.day_no}`;
  if (p.game_id.startsWith('c-')) return 'Custom puzzle';
  return getGameDef(p.game_id)?.title ?? 'Puzzle';
}

function playSub(p: PlayRow) {
  if (p.day_no != null) return `${getGameDef(p.game_id)?.noun ?? ''} · ${dailyDate(p.day_no)}`;
  const g = getGameDef(p.game_id);
  return g ? g.category : 'Made from a topic';
}

/** /u/:handle. A player's public page: identity and play. Settings live elsewhere. */
export function Profile() {
  const { handle = '' } = useParams();
  const auth = useAuth();
  const own = auth.profile?.handle === handle;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const profile = await fetchProfileByHandle(handle).catch(() => null);
      if (!alive) return;
      if (!profile) return setState({ status: 'missing' });
      // Your own page counts every play of yours; everyone else sees verified plays only.
      const plays = await (own ? fetchOwnPlays() : fetchPublicPlays(handle)).catch(() => []);
      if (alive) setState({ status: 'ready', profile, plays });
    })();
    return () => {
      alive = false;
    };
  }, [handle, own]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  if (state.status === 'loading') return <div className={styles.page} aria-busy="true" />;
  if (state.status === 'missing') {
    return (
      <div className={styles.page}>
        <h1 className={styles.name}>No player called @{handle}.</h1>
        <p className={styles.muted}>Check the spelling, or find a puzzle instead.</p>
        <div>
          <Button to="/play">Play</Button>
        </div>
      </div>
    );
  }

  const { profile, plays } = state;
  const today = dayNo();
  const s = profileStats(plays, today);

  return (
    <div className={styles.page}>
      <header className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {profile.name.charAt(0).toUpperCase()}
        </span>
        <div className={styles.names}>
          <h1 className={styles.name}>{profile.name}</h1>
          <span className={styles.handle}>
            @{profile.handle} · Playing since {monthYear(profile.created_at)}
          </span>
        </div>
        {own && (
          <div className={styles.ownActions}>
            <Button variant="secondary" size="sm" to="/settings">
              Settings
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => setNote((await copyText(window.location.href)) ? 'Link copied.' : window.location.href)}
            >
              Copy link
            </Button>
          </div>
        )}
      </header>
      <span className={styles.note} role="status">
        {note}
      </span>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Streak</dt>
          <dd className={styles.statValue}>
            {s.streak}
            <span className={styles.unit}>{s.streak === 1 ? ' day' : ' days'}</span>
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Best streak</dt>
          <dd className={styles.statValue}>
            {s.bestStreak}
            <span className={styles.unit}>{s.bestStreak === 1 ? ' day' : ' days'}</span>
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
              title={`${dailyDate(c.day)}: ${c.state === 'none' ? 'not played' : c.state === 'perfect' ? 'every word found' : 'played'}`}
            >
              <span className={styles.srOnly}>
                {dailyDate(c.day)}, {c.state === 'none' ? 'not played' : c.state === 'perfect' ? 'every word found' : 'played'}
              </span>
            </li>
          ))}
        </ol>
        <div className={styles.dayScale} aria-hidden="true">
          <span>{dailyDate(today - 13)}</span>
          <span>Today</span>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="recent-title">
        <h2 id="recent-title" className={styles.h2}>
          Recent
        </h2>
        {s.recent.length === 0 ? (
          <p className={styles.muted}>
            {own ? 'Nothing yet. ' : `@${profile.handle} has no verified plays yet. `}
            <Link to="/play" className={styles.inline}>
              {own ? "Play today's daily" : 'Find a puzzle'}
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
                    {own && p.verified === false && ' · Unverified'}
                  </span>
                </div>
                <span className={styles.rowFound}>{p.total == null ? `${p.found} found` : `${p.found}/${p.total}`}</span>
                <span className={styles.rowTime}>{formatTime(p.secs)}</span>
                <span className={styles.rowScore}>{p.score.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

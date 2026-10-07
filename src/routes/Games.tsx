import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilterTabs } from '../components/FilterTabs';
import { GameRow } from '../components/GameRow';
import { buttonClass } from '../components/buttonClass';
import { filters, games, getPuzzle } from '../games/catalog';
import { pick } from '../copy';
import { loadDaily, today } from '../games/daily';
import { useStreak } from '../lib/useStreak';
import { TextLink } from '../components/TextLink';
import { useAuth } from '../lib/auth';
import { CustomTopic } from './CustomTopic';
import { GameInvites } from './GameInvites';
import styles from './Games.module.css';

function DailyCard() {
  const t = today();
  const saved = loadDaily(t.n);
  const played = saved?.endAt != null;
  // A run worth keeping is the best reason to play today. Picked once, so it does not change under the reader.
  const { streak } = useStreak();
  const keep = useMemo(() => (!played && streak >= 2 ? pick('streakKeep', { n: streak }) : ''), [played, streak]);
  return (
    <Link to={`/d/${t.n}`} className={styles.daily}>
      <span className={styles.dailyText}>
        <span className={styles.kicker}>
          {t.holiday ? `${t.holiday} daily` : 'Daily'} #{t.n} · {t.date}
        </span>
        <span className={styles.dailyTitle}>{t.def.title}</span>
        <span className={styles.dailySub}>
          {played
            ? `Done for today. You found ${saved.found.length}. New puzzle at midnight.`
            : keep || 'One try. Count hidden. Wrong picks cost 10.'}
        </span>
      </span>
      <span className={buttonClass(played ? 'secondary' : 'accent')}>{played ? 'See result' : 'Play today'}</span>
    </Link>
  );
}

export function Games() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const filter = filters.includes(params.get('f') ?? '') ? params.get('f')! : 'All';

  const rows = games
    .filter((g) => filter === 'All' || g.category === filter)
    .map((g, i) => ({ g, i }))
    .sort((x, y) => filters.indexOf(x.g.category) - filters.indexOf(y.g.category) || x.i - y.i)
    .map(({ g }) => {
      const p = getPuzzle(g.id)!;
      return { id: g.id, category: g.category, title: g.title, meta: `${p.answers.length} words · ${p.difficulty}` };
    });

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>
        Pick a game.
        <br />
        <span className={styles.sub}>Start finding.</span>
      </h1>

      <GameInvites />

      <DailyCard />

      <section className={styles.list} aria-label="Games">
        <FilterTabs
          label="Filter games"
          options={filters}
          value={filter}
          onChange={(f) => setParams(f === 'All' ? {} : { f }, { replace: true })}
        />
        <ul className={styles.rows}>
          {rows.map((r) => (
            <GameRow key={r.id} to={`/play/${r.id}`} category={r.category} title={r.title} meta={r.meta} />
          ))}
        </ul>
      </section>

      <CustomTopic />

      {auth.enabled && (
        <p className={styles.make}>
          <TextLink to="/make">Make your own puzzle</TextLink>
          <span className={styles.dailySub}>Hide words in your own paragraph and dare a friend.</span>
        </p>
      )}
    </div>
  );
}

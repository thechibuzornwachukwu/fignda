import { Link, useSearchParams } from 'react-router-dom';
import { FilterTabs } from '../components/FilterTabs';
import { GameRow } from '../components/GameRow';
import { buttonClass } from '../components/buttonClass';
import { filters, games, getPuzzle } from '../games/catalog';
import { loadDaily, today } from '../games/daily';
import { CustomTopic } from './CustomTopic';
import styles from './Games.module.css';

function DailyCard() {
  const t = today();
  const saved = loadDaily(t.n);
  const played = saved?.endAt != null;
  return (
    <Link to={`/d/${t.n}`} className={styles.daily}>
      <span className={styles.dailyText}>
        <span className={styles.kicker}>
          Daily #{t.n} · {t.date}
        </span>
        <span className={styles.dailyTitle}>{t.def.title}</span>
        <span className={styles.dailySub}>
          {played
            ? `Done for today. You found ${saved.found.length}. New puzzle at midnight.`
            : 'One try. Count hidden. Wrong picks cost 10.'}
        </span>
      </span>
      <span className={buttonClass(played ? 'secondary' : 'accent')}>{played ? 'See result' : 'Play today'}</span>
    </Link>
  );
}

export function Games() {
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
    </div>
  );
}

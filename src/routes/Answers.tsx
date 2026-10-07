import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { dayNo } from '../engine/daily';
import { dailyInfo, dailyLabel } from '../games/daily';
import { registry } from '../games/registry';
import { fetchWordStats } from '../lib/api';
import { useAuth } from '../lib/auth';
import { MIN_PLAYERS, type WordStat } from '../lib/wordStats';
import styles from './Answers.module.css';

/** /d/N/answers. Every hidden word of a past daily, and how many players found each. Today's stay hidden. */
export function Answers() {
  const { n = '' } = useParams();
  const auth = useAuth();
  const num = Number(n);
  const today = dayNo();
  const ok = Number.isInteger(num) && num >= 1 && num < today;
  const info = ok ? dailyInfo(num) : null;
  const answers = useMemo(() => (info ? registry[info.def.type].answers(registry[info.def.type].build(info.def)) : []), [info]);
  const [stats, setStats] = useState<WordStat[]>([]);

  useEffect(() => {
    if (!ok || !auth.enabled) return;
    let alive = true;
    fetchWordStats(num)
      .then((s) => alive && setStats(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ok, num, auth.enabled]);

  if (!info) return <Navigate to="/play" replace />;
  const byKey = new Map(stats.map((s) => [s.key, s]));
  const pct = (key: string) => {
    const s = byKey.get(key);
    return s && s.players >= MIN_PLAYERS ? `${Math.round((s.found / s.players) * 100)}% found it` : '';
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <span className={styles.kicker}>
          {dailyLabel(num)} #{num} · {info.date}
        </span>
        <div className={styles.nav}>
          {num > 1 && (
            <Link to={`/d/${num - 1}/answers`} className={styles.navBtn} aria-label="Previous day">
              <Icon icon={ChevronLeft} size={18} />
            </Link>
          )}
          {num + 1 < today && (
            <Link to={`/d/${num + 1}/answers`} className={styles.navBtn} aria-label="Next day">
              <Icon icon={ChevronRight} size={18} />
            </Link>
          )}
        </div>
      </div>
      <h1 className={styles.title}>
        Answers.
        <br />
        <span className={styles.sub}>
          {answers.length} hidden {info.def.noun}.
        </span>
      </h1>

      <blockquote className={styles.text}>{info.def.text}</blockquote>

      <ol className={styles.list} aria-label="Answers">
        {answers.map((a, i) => (
          <li key={a.key} className={styles.row}>
            <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.word}>{a.label}</span>
            <span className={styles.pct}>{pct(a.key)}</span>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <Button variant="accent" to={`/d/${today}`}>
          Play today's daily
        </Button>
        <Button variant="secondary" to={`/leaderboard?day=${num}`}>
          See who led that day
        </Button>
      </div>
    </div>
  );
}

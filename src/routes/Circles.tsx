import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { PartnerNote } from '../components/PartnerNote';
import { Segmented } from '../components/Segmented';
import { Skeleton, SkeletonGroup, SkeletonList } from '../components/Skeleton';
import { dayNo } from '../engine/daily';
import { formatTime } from '../engine/time';
import {
  createCircle, fetchCircle, fetchCircleBoard, fetchCircleWeek, joinCircle, leaveCircle, myCircles, removeFromCircle,
  type CircleInfo, type CircleRow, type CircleWeekRow,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { copyText } from '../lib/share';
import board from './Leaderboard.module.css';
import styles from './Circles.module.css';

const people = (n: number) => (n === 1 ? '1 player' : `${n} players`);

/** Your circles, and the form to start one. */
export function Circles() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Awaited<ReturnType<typeof myCircles>> | null>(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const signedIn = !!auth.profile;

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    myCircles()
      .then((l) => alive && setList(l))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, [signedIn]);

  if (!auth.enabled) return <Navigate to="/play" replace />;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.replace(/\s+/g, ' ').trim();
    if (clean.length < 2 || clean.length > 40 || /[<>]/.test(clean)) return setErr('Use 2 to 40 letters for the name.');
    setBusy(true);
    setErr('');
    const r = await createCircle(clean).catch(() => ({ error: 'failed' as const }));
    setBusy(false);
    if ('code' in r) return navigate(`/c/${r.code}`);
    setErr(r.error === 'limit' ? 'You are in 20 circles. Leave one to start another.' : r.error === 'invalid' ? 'Use 2 to 40 letters for the name.' : 'Could not start the circle. Try again.');
  };

  return (
    <div className={board.page}>
      <Link to="/players" className={board.back}>
        <Icon icon={ChevronLeft} size={16} />
        Squad
      </Link>
      <h1 className={board.title}>
        Circles.
        <br />
        <span className={board.sub}>Your people, one table.</span>
      </h1>
      <p className={styles.lead}>
        A circle is a private daily table for your family, class, church or office. Start one, send the link, and see who read most carefully today.
      </p>

      {!signedIn && !auth.loading && (
        <p className={board.guest}>
          Circles rank verified scores, so they need an account.{' '}
          <Link to="/signin?next=%2Fcircles" className={board.inline}>
            Sign in
          </Link>
        </p>
      )}

      {signedIn && (
        <>
          <section className={board.section} aria-labelledby="mine-title">
            <h2 id="mine-title" className={board.h2}>
              Your circles
            </h2>
            {list === null && <SkeletonList rows={2} stat={false} />}
            {list?.length === 0 && (
              <PartnerNote className={board.empty}>
                <p>You are not in a circle yet. Start one below.</p>
              </PartnerNote>
            )}
            {!!list?.length && (
              <ul className={styles.list}>
                {list.map((c) => (
                  <li key={c.code}>
                    <Link to={`/c/${c.code}`} className={styles.circle}>
                      <span className={styles.circleName}>{c.name}</span>
                      <span className={styles.circleMeta}>
                        {people(c.members)}
                        {c.is_owner ? ' · You started it' : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={board.section} aria-labelledby="new-title">
            <h2 id="new-title" className={board.h2}>
              Start a circle
            </h2>
            <form className={styles.form} onSubmit={create} noValidate>
              <Field label="Circle name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Obi family" autoComplete="off" />
              <Button type="submit" disabled={busy}>
                Start circle
              </Button>
            </form>
            <p className={styles.err} role="alert">
              {err}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

type View = 'today' | 'week';

/** One circle: who is in, today's table, the last 7 days, the invite. Also the page an invite link opens. */
export function Circle() {
  const { code = '' } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const me = auth.profile;
  const today = dayNo();
  const [info, setInfo] = useState<CircleInfo | null | undefined>(undefined);
  const [view, setView] = useState<View>('today');
  const [rows, setRows] = useState<CircleRow[] | null>(null);
  const [week, setWeek] = useState<CircleWeekRow[] | null>(null);
  const [note, setNote] = useState('');
  const [tick, setTick] = useState(0);
  const userId = me?.id;

  useEffect(() => {
    let alive = true;
    fetchCircle(code)
      .then((c) => alive && setInfo(c))
      .catch(() => alive && setInfo(null));
    return () => {
      alive = false;
    };
  }, [code, userId, tick]);

  const member = !!info?.is_member;
  useEffect(() => {
    if (!member) return;
    let alive = true;
    Promise.all([fetchCircleBoard(code, today), fetchCircleWeek(code)])
      .then(([r, w]) => {
        if (!alive) return;
        setRows(r);
        setWeek(w);
      })
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [member, code, today, tick]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  if (info === null) return <Navigate to="/circles" replace />;
  if (info === undefined) {
    return (
      <div className={board.page}>
        <SkeletonGroup>
          <Skeleton width="60%" height={40} />
        </SkeletonGroup>
        <SkeletonList rows={5} avatar={28} />
      </div>
    );
  }

  const url = `${window.location.origin}/c/${info.code}`;
  const invite = async () => {
    const text = `Join ${info.name} on Gazecraft. One puzzle a day, one table for us.`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
    } catch {
      /* closed the sheet: copy instead */
    }
    setNote((await copyText(`${text} ${url}`)) ? 'Invite copied. Paste it in your group.' : url);
  };
  const join = async () => {
    const r = await joinCircle(info.code).catch(() => 'failed' as const);
    if (r === 'joined') return setTick((t) => t + 1);
    setNote(r === 'full' ? 'This circle is full (50 players).' : r === 'limit' ? 'You are in 20 circles. Leave one first.' : 'Could not join. Try again.');
  };
  const leave = async () => {
    if (await leaveCircle(info.code)) navigate('/circles');
  };
  const remove = async (handle: string) => {
    if (await removeFromCircle(info.code, handle)) setTick((t) => t + 1);
  };

  const played = rows?.filter((r) => r.score != null).length ?? 0;

  return (
    <div className={board.page}>
      <Link to="/circles" className={board.back}>
        <Icon icon={ChevronLeft} size={16} />
        Circles
      </Link>
      <h1 className={board.title}>
        {info.name}.
        <br />
        <span className={board.sub}>{people(info.members)}.</span>
      </h1>

      {!member && (
        <section className={board.section} aria-label="Join this circle">
          <p className={styles.lead}>You have been invited. Join to see the table and put your daily score on it.</p>
          {me ? (
            <div>
              <Button onClick={join}>Join {info.name}</Button>
            </div>
          ) : (
            !auth.loading && (
              <div>
                <Button to={`/signin?next=${encodeURIComponent(`/c/${info.code}`)}`}>Sign in to join</Button>
              </div>
            )
          )}
          <p className={styles.err} role="status">
            {note}
          </p>
        </section>
      )}

      {member && (
        <section className={board.section} aria-labelledby="table-title">
          <div className={board.head}>
            <div className={board.headText}>
              <span className={board.kicker}>{view === 'today' ? `Today · Daily #${today}` : 'Last 7 dailies'}</span>
              <h2 id="table-title" className={board.h2}>
                {view === 'today' ? (rows ? `${played} of ${rows.length} have played` : 'Today') : 'Scores added up'}
              </h2>
            </div>
            <div className={styles.actions}>
              <Button to={`/d/${today}`} size="sm">
                Play today
              </Button>
              <Button variant="secondary" size="sm" onClick={invite}>
                Invite
              </Button>
            </div>
          </div>
          <div className={board.switch}>
            <Segmented
              label="Table"
              hideLabel
              options={[
                ['today', 'Today'],
                ['week', '7 days'],
              ]}
              value={view}
              onChange={(v) => setView(v as View)}
            />
          </div>
          <p className={styles.err} role="status">
            {note}
          </p>

          {rows === null && <SkeletonList rows={5} avatar={28} />}
          {view === 'today' && rows && (
            <ol className={board.board} aria-label="Today in this circle">
              {rows.map((r) => (
                <li key={r.handle} className={board.row} data-mine={r.handle === me?.handle || undefined} data-waiting={r.score == null || undefined}>
                  <span className={board.rank}>{r.rank == null ? '··' : String(r.rank).padStart(2, '0')}</span>
                  <Link to={`/u/${r.handle}`} className={board.handle}>
                    <Avatar handle={r.handle} size={28} />
                    {r.name}
                    {r.handle === me?.handle && <span className={board.you}>You</span>}
                  </Link>
                  {r.score == null ? (
                    <>
                      <span className={board.found}>Not yet</span>
                      <span className={board.time} />
                      <span className={board.score}>
                        {info.is_owner && r.handle !== me?.handle && (
                          <button type="button" className={styles.remove} onClick={() => void remove(r.handle)} aria-label={`Remove ${r.name}`}>
                            Remove
                          </button>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={board.found}>{r.total == null ? `${r.found} found` : `${r.found}/${r.total}`}</span>
                      <span className={board.time}>{formatTime(r.secs ?? 0)}</span>
                      <span className={board.score}>{r.score.toLocaleString('en-US')}</span>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          {view === 'week' && week && (
            <ol className={board.board} aria-label="Last 7 dailies in this circle">
              {week.map((r) => (
                <li key={r.handle} className={board.row} data-mine={r.handle === me?.handle || undefined}>
                  <span className={board.rank}>{String(r.rank).padStart(2, '0')}</span>
                  <Link to={`/u/${r.handle}`} className={board.handle}>
                    <Avatar handle={r.handle} size={28} />
                    {r.name}
                    {r.handle === me?.handle && <span className={board.you}>You</span>}
                  </Link>
                  <span className={board.found}>{r.days === 1 ? '1 day' : `${r.days} days`}</span>
                  <span className={board.time} />
                  <span className={board.score}>{r.score.toLocaleString('en-US')}</span>
                </li>
              ))}
            </ol>
          )}
          <div>
            <button type="button" className={styles.leave} onClick={() => void leave()}>
              Leave this circle
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

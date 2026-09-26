import { GameRow } from '../components/GameRow';
import { getPuzzle } from '../games/catalog';
import { LandingDemo } from './LandingDemo';
import styles from './Landing.module.css';

/** Landing list: a friendly name per curated game. Counts and levels come from the engine. */
const PICKS = [
  ['bible', 'Books of the Bible'],
  ['nigeria', 'Nigerian names'],
  ['french', 'French names'],
  ['football', 'Football'],
  ['health', 'Medicine and nursing'],
  ['science', 'Science'],
  ['ai', 'AI'],
  ['history', 'History'],
  ['general', 'General knowledge'],
] as const;

const STEPS = ['Choose your topic', 'Pick a game', 'Start finding'];

export function Landing() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.wrap}>
          <h1 className={styles.display}>
            Find it.
            <br />
            <span className={styles.sub}>Figure it out.</span>
          </h1>
        </div>
      </section>

      <section id="how" className={styles.how} aria-label="Try it">
        <div className={styles.wrap}>
          <LandingDemo />
        </div>
      </section>

      <section id="games" className={styles.band} aria-labelledby="games-title">
        <div className={`${styles.wrap} ${styles.columns}`}>
          <div className={styles.side}>
            <h2 id="games-title" className={styles.h2}>
              Pick a topic
            </h2>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s}>
                  <span className={styles.stepNo}>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <ul className={styles.games}>
            {PICKS.map(([id, name]) => {
              const p = getPuzzle(id)!;
              return (
                <GameRow
                  key={id}
                  size="md"
                  to={`/play/${id}`}
                  title={name}
                  meta={`${p.answers.length} words · ${p.difficulty}`}
                />
              );
            })}
          </ul>
        </div>
      </section>

      <section id="about" className={styles.about} aria-labelledby="about-title">
        <div className={`${styles.wrap} ${styles.columns}`}>
          <h2 id="about-title" className={styles.aboutLabel}>
            About
          </h2>
          <p className={styles.aboutText}>
            It began with an old puzzle that hid thirty books of the Bible in one paragraph. People passed it around
            for years. <span className={styles.sub}>Fignda makes that kind of puzzle for any subject.</span>
          </p>
        </div>
      </section>
    </>
  );
}

import { Button } from '../components/Button';
import { GameRow } from '../components/GameRow';
import { TextLink } from '../components/TextLink';
import { getPuzzle } from '../games/catalog';
import { today } from '../games/daily';
import { LandingDemo } from './LandingDemo';
import { HowTo } from './LandingHowTo';
import { CastStack, Features, HeroArt } from './LandingPreviews';
import styles from './Landing.module.css';

/** Landing list: a friendly name per curated game. Counts and levels come from the engine. */
const PICKS = [
  ['general', 'General knowledge'],
  ['science', 'Science'],
  ['football', 'Football'],
  ['nigeria', 'Nigerian names'],
  ['french', 'French names'],
  ['health', 'Medicine and nursing'],
  ['ai', 'AI'],
  ['history', 'History'],
  ['bible', 'Books of the Bible'],
] as const;

const STEPS = ['Choose your topic', 'Pick a game', 'Start finding'];

export function Landing() {
  return (
    <>
      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div className={styles.pitch}>
            <h1 className={styles.display}>
              Find it.
              <br />
              <span className={styles.sub}>Figure it out.</span>
            </h1>
            <p className={styles.lede}>
              Words are hiding inside ordinary sentences, across the spaces and the commas. Drag over the letters to
              pull them out.
            </p>
            <div className={styles.actions}>
              <Button to={`/d/${today().n}`}>Play today's daily</Button>
              <Button to="/#how" variant="secondary">
                Try it here
              </Button>
            </div>
            <p className={styles.proof}>
              <CastStack />
              Free in your browser. Play as a guest, sign in when you want your name on the board.
            </p>
          </div>
          <HeroArt />
        </div>
      </section>

      <section id="how" className={styles.how} aria-labelledby="how-title">
        <div className={`${styles.wrap} ${styles.stack}`}>
          <h2 id="how-title" className={styles.h2}>
            Two ways to find a word
          </h2>
          <HowTo />
          <LandingDemo />
        </div>
      </section>

      <section className={styles.more} aria-labelledby="more-title">
        <div className={`${styles.wrap} ${styles.stack}`}>
          <h2 id="more-title" className={styles.h2}>
            More than one way to play
          </h2>
          <Features />
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
            <TextLink to="/play">Or type any topic</TextLink>
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

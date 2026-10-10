import { useState } from 'react';
import { Button } from '../components/Button';
import { GameRow } from '../components/GameRow';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { nextClueTo } from '../games/caseFile';
import { getPuzzle, sponsorFor } from '../games/catalog';
import { today } from '../games/daily';
import { hasPlayed } from '../lib/firstMinute';
import { useMediaQuery } from '../lib/media';
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

const WHY = [
  ['It ends', 'One daily puzzle and no feed under it. When you finish, you are done for today.'],
  ['It is worth reading', 'Every puzzle is a small scene in plain words, not filler around the answers.'],
  ['It respects you', 'Free to play, as a guest if you like. Nothing nags you to stay.'],
] as const;

export function Landing() {
  // Play first (BUILD_PLAN 3b): a first time visitor on a phone opens on the demo sentence, with the pitch under it.
  // Decided once, when the page opens, so finishing the demo does not move the page under the player.
  const [fresh] = useState(() => !hasPlayed());
  // Play first: a new player lands in a clue, one short sitting. Today's daily is for a player who has been here.
  const [firstClue] = useState(() => (fresh ? nextClueTo() : null));
  const phone = useMediaQuery('(max-width: 759px)');
  const playFirst = fresh && phone;
  // One h1 on the page: the demo's when it leads, the pitch's otherwise.
  const Pitch = playFirst ? 'h2' : 'h1';
  return (
    <>
      {playFirst && (
        <section className={styles.first} aria-labelledby="first-title">
          <div className={`${styles.wrap} ${styles.stack}`}>
            <h1 id="first-title" className={styles.firstTitle}>
              Words are hiding in this sentence.
            </h1>
            <LandingDemo guide />
          </div>
        </section>
      )}

      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div className={styles.pitch}>
            <Pitch className={styles.display}>
              Do you have
              <br />
              <span className={styles.sub}>what it takes?</span>
            </Pitch>
            <p className={styles.lede}>
              Words are hiding inside ordinary sentences, across the spaces and the commas. Drag over the letters to
              pull them out.
            </p>
            <div className={styles.actions}>
              {firstClue ? <Button to={firstClue}>Play your first clue</Button> : <Button to={`/d/${today().n}`}>Play today's daily</Button>}
              {!playFirst && (
                <Button to="/#how" variant="secondary">
                  Try it here
                </Button>
              )}
            </div>
            <p className={styles.proof}>
              <CastStack />
              Free in your browser. Play as a guest, sign in when you want your name on the board.
            </p>
          </div>
          <HeroArt />
        </div>
      </section>

      <section className={styles.promise} aria-labelledby="promise-title">
        <div className={`${styles.wrap} ${styles.stack}`}>
          <div className={styles.promiseHead}>
            <h2 id="promise-title" className={styles.h2}>
              Slow down. Look closer.
            </h2>
            <p className={styles.lede}>
              One paragraph a day, with words hidden in plain sight. About 5 minutes, then it is over.
            </p>
          </div>
          <ul className={styles.why}>
            {WHY.map(([title, line]) => (
              <li key={title} className={styles.whyItem}>
                <h3 className={styles.h3}>{title}</h3>
                <p className={styles.whyLine}>{line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how" className={styles.how} aria-labelledby="how-title">
        <div className={`${styles.wrap} ${styles.stack}`}>
          <h2 id="how-title" className={styles.h2}>
            Two ways to find a word
          </h2>
          <HowTo />
          {!playFirst && <LandingDemo />}
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
            <TextLink to="/play#any-topic">Or type any topic</TextLink>
          </div>
          <ul className={styles.games}>
            {PICKS.map(([id, name]) => {
              const p = getPuzzle(id)!;
              const sponsor = sponsorFor(p);
              return (
                <GameRow
                  key={id}
                  size="md"
                  to={`/play/${id}`}
                  title={name}
                  meta={`${p.answers.length} words · ${p.difficulty}`}
                  sponsor={sponsor ? pick('sponsorWith', { name: sponsor.name }) : undefined}
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
            for years.{' '}
            <span className={styles.sub}>
              Gazecraft makes that kind of puzzle for any subject. The only trick is to slow down and look closer.
            </span>
          </p>
        </div>
      </section>
    </>
  );
}

import { DEFAULT_AVATAR, type Avatar as AvatarParts } from '../avatar/draw';
import { Avatar } from '../components/Avatar';
import { Letter } from '../components/Letter';
import { ProgressLine } from '../components/ProgressLine';
import { TextLink } from '../components/TextLink';
import { score } from '../engine/score';
import type { GameDef } from '../games/catalog';
import { today } from '../games/daily';
import { registry } from '../games/registry';
import styles from './LandingPreviews.module.css';

/** The landing cast. Drawn from parts, never looked up, so a guest loads nothing. */
const look = (parts: Partial<AvatarParts>): AvatarParts => ({ ...DEFAULT_AVATAR, ...parts });
const CAST = {
  chidi: { name: 'Chidi', parts: look({ back: 0, skin: 5, hair: 7, mouth: 3, face: 1, extra: 3, item: 1, outfit: 1 }) },
  temi: { name: 'Temi', parts: look({ back: 3, skin: 4, hair: 22, eyes: 2, mouth: 1, tie: 1, extra: 2, outfit: 4 }) },
  bisi: { name: 'Bisi', parts: look({ back: 4, skin: 3, hair: 6, eyes: 3, extra: 2, mark: 3, outfit: 5 }) },
  zainab: { name: 'Zainab', parts: look({ back: 5, skin: 2, hair: 8, eyes: 1 }) },
  ada: { name: 'Ada', parts: look({ back: 2, skin: 4, hair: 3, eyes: 5, mouth: 6 }) },
  emeka: { name: 'Emeka', parts: look({ back: 0, skin: 5, hair: 18, face: 3, mouth: 3, item: 2, mark: 5, outfit: 2 }) },
  emma: { name: 'Emma', parts: look({ back: 3, skin: 0, hair: 11, colour: 3, eyes: 2, mouth: 1, extra: 1, mark: 4, outfit: 9 }) },
  liam: { name: 'Liam', parts: look({ back: 5, skin: 1, hair: 10, colour: 4, face: 1, mouth: 3, mark: 1, outfit: 7 }) },
} as const;

/** A puzzle only the landing page shows, so the preview spoils nothing in the catalogue. */
const PEEK: GameDef = {
  id: 'peek',
  type: 'hidden-words',
  category: 'Demo',
  title: 'Around the world',
  noun: 'cities',
  difficulty: 'Easy',
  expectedAnswers: ['Cairo', 'Oslo', 'Milan', 'Rome', 'Delhi', 'Lagos', 'Doha', 'Lima'],
  dict: ['Cairo', 'Oslo', 'Milan', 'Rome', 'Delhi', 'Lagos', 'Doha', 'Lima'],
  text: 'Luca, I rode home also slowly. Kamil answered from every corner while the model hired a van. Wave a flag, Osa said, and do half the final image.',
};
/** How many of them the preview shows as found, in reading order. */
const PEEK_FOUND = 4;
const PEEK_TEAM = [CAST.chidi, CAST.temi, CAST.bisi] as const;

const mod = registry[PEEK.type];
const peek = mod.build(PEEK);
const peekAnswers = peek.answers;
const peekFound = peekAnswers.slice(0, PEEK_FOUND);
const peekSpans = peekFound.map((a) => a.spans[0]!);
const inFound = (from: number, to: number) => from >= 0 && to >= 0 && peekSpans.some(([a, b]) => from >= a && to <= b);

/** A game in play: 3 players, a paragraph, the words they have found so far. */
export function HeroArt() {
  return (
    <div
      className={styles.art}
      role="img"
      aria-label={`A Fignda puzzle in play. ${PEEK_TEAM.length} players have found ${peekFound.length} of ${peekAnswers.length} hidden ${PEEK.noun}.`}
    >
      <div className={styles.cast}>
        {PEEK_TEAM.map((p, i) => (
          <div key={p.name} className={styles.castMember}>
            <Avatar parts={p.parts} size={96} className={styles.castFace} />
            <span className={styles.found}>{peekFound.filter((_, n) => n % PEEK_TEAM.length === i).at(-1)?.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.board}>
        <div className={styles.boardHead}>
          <span className={styles.boardTitle}>{PEEK.title}</span>
          <span className={styles.boardCount}>
            {peekFound.length} / {peekAnswers.length}
          </span>
        </div>
        <ProgressLine value={peekFound.length / peekAnswers.length} label="Found" />
        <p className={styles.boardText}>
          {peek.chars.map((c, i) => (
            <Letter
              key={i}
              ch={c.ch}
              li={-1}
              state={(c.li >= 0 ? inFound(c.li, c.li) : inFound(c.prev ?? -1, c.next ?? -1)) ? 'found' : ''}
              hint={false}
              caret={false}
            />
          ))}
        </p>
        <div className={styles.chips}>
          {peekAnswers.map((a, i) =>
            i < peekFound.length ? (
              <span key={a.key} className={styles.found}>
                {a.label}
              </span>
            ) : (
              <span key={a.key} className={styles.hidden}>
                {'•'.repeat(a.key.length)}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/** 7 days, oldest first. The last is today, still to play. */
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const RUN = 5;

function DailyPreview() {
  const t = today();
  return (
    <div className={styles.preview} aria-hidden="true">
      <span className={styles.kicker}>
        {t.holiday ? `${t.holiday} daily` : 'Daily'} #{t.n} · {t.date}
      </span>
      <span className={styles.previewTitle}>{t.def.title}</span>
      <div className={styles.week}>
        {WEEK.map((d, i) => (
          <span key={i} className={styles.day}>
            <span className={i >= WEEK.length - 1 - RUN && i < WEEK.length - 1 ? styles.cellOn : styles.cell} />
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

function TogetherPreview() {
  const rows = [
    [CAST.temi, peekAnswers[1]],
    [CAST.zainab, peekAnswers[4]],
    [CAST.liam, peekAnswers[6]],
  ] as const;
  return (
    <div className={styles.preview} aria-hidden="true">
      <span className={styles.room}>
        Room <span className={styles.code}>K7WQ4M</span>
      </span>
      <div className={styles.rows}>
        {rows.map(([p, a]) => (
          <div key={p.name} className={styles.row}>
            <Avatar parts={p.parts} size={40} />
            <span className={styles.name}>{p.name}</span>
            <span className={styles.found}>{a?.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Three finished games of 26 words, scored by the engine. */
const BOARD = [
  { who: CAST.ada, play: { found: 26, total: 26, hints: 0, misses: 0, secs: 214 } },
  { who: CAST.emeka, play: { found: 26, total: 26, hints: 1, misses: 0, secs: 305 } },
  { who: CAST.emma, play: { found: 24, total: 26, hints: 2, misses: 0, secs: 420 } },
] as const;

function BoardPreview() {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.rows}>
        {BOARD.map(({ who, play }, i) => (
          <div key={who.name} className={styles.row}>
            <span className={styles.rank}>{i + 1}</span>
            <Avatar parts={who.parts} size={28} />
            <span className={styles.name}>{who.name}</span>
            <span className={styles.points}>{score(play).toLocaleString('en-GB')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CharactersPreview() {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.faces}>
        {Object.values(CAST).map((p) => (
          <Avatar key={p.name} parts={p.parts} size={64} className={styles.face} />
        ))}
      </div>
    </div>
  );
}

/** What there is to do once you can find a word. */
export function Features() {
  const t = today();
  return (
    <ul className={styles.features}>
      <li className={styles.wide}>
        <DailyPreview />
        <h3 className={styles.h3}>A new one every day</h3>
        <p className={styles.body}>One puzzle, one try, the same for everyone. Play each day and your run grows.</p>
        <TextLink to={`/d/${t.n}`}>Play today's daily</TextLink>
      </li>
      <li className={styles.narrow}>
        <TogetherPreview />
        <h3 className={styles.h3}>Play it together</h3>
        <p className={styles.body}>Open a room and send the code. Everyone hunts in the same paragraph at once.</p>
        <TextLink to="/play">Pick a game to share</TextLink>
      </li>
      <li className={styles.narrow}>
        <BoardPreview />
        <h3 className={styles.h3}>Climb the board</h3>
        <p className={styles.body}>Every find is 100 points. Finish fast and clean to take the top row.</p>
        <TextLink to="/leaderboard">See who is leading</TextLink>
      </li>
      <li className={styles.wide}>
        <CharactersPreview />
        <h3 className={styles.h3}>Look like yourself</h3>
        <p className={styles.body}>Build your character from hair, outfits and moods. Every look is free.</p>
        <TextLink to="/players">Meet the players</TextLink>
      </li>
    </ul>
  );
}

/** A few faces for the line under the hero buttons. */
export function CastStack() {
  return (
    <span className={styles.stack} aria-hidden="true">
      {[CAST.zainab, CAST.ada, CAST.emeka, CAST.emma].map((p) => (
        <Avatar key={p.name} parts={p.parts} size={32} className={styles.stackFace} />
      ))}
    </span>
  );
}

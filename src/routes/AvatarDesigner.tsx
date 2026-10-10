import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Check, Dices, Lock, Palette, Pencil, Scissors, Shirt, Smile, Undo2, X, type LucideIcon } from 'lucide-react';
import { avatarCode, avatarFor, orderFor, parseAvatar, PARTS, surprise, type Avatar as Parts, type PartKey } from '../avatar/draw';
import { howTo, isEarned, needOf } from '../avatar/earned';
import { MOODS } from '../avatar/parts/face';
import { HAIR_FAMILIES, HAIR_STYLES, type HairFamily } from '../avatar/parts/hair';
import { BACKS, HAIR_COLOURS, SKINS } from '../avatar/shapes';
import { setAvatarCode } from '../avatar/store';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { doneClues } from '../games/caseFile';
import { games } from '../games/catalog';
import { fetchPoints, saveAvatar, saveLook } from '../lib/api';
import { keepLook, loadLook } from '../lib/firstMinute';
import { LOOK_CHOICES, type LookChoice } from '../lib/onboarding';
import styles from './AvatarDesigner.module.css';

/**
 * The editor's four tabs, and the parts each one holds, in the order a face is built.
 * A new part in PARTS that is not listed here still shows, under Wear.
 */
const TABS: Array<{ key: string; title: string; icon: LucideIcon; parts: PartKey[] }> = [
  { key: 'face', title: 'Face', icon: Smile, parts: ['skin', 'eyes', 'mouth', 'mark', 'face'] },
  { key: 'hair', title: 'Hair', icon: Scissors, parts: ['hair', 'colour', 'tie'] },
  { key: 'wear', title: 'Wear', icon: Shirt, parts: ['outfit', 'kit', 'extra', 'item'] },
  { key: 'scene', title: 'Scene', icon: Palette, parts: ['back', 'festive'] },
];
const listed = new Set(TABS.flatMap((t) => t.parts));
TABS[2]!.parts.push(...PARTS.map((p) => p.key).filter((k) => !listed.has(k)));

/** Parts chosen as a colour dot rather than a picture. */
const SWATCHES: Partial<Record<PartKey, readonly string[]>> = { skin: SKINS, colour: HAIR_COLOURS, back: BACKS };
/** Close-ups: where each part's thumbnails look, so the difference between two choices is easy to see. */
const FACE = '25 31 46 46';
const HEAD = '6 -2 84 84';
const CHEST = '12 50 72 72';
const WHOLE = '-7 -2 110 110';
const VIEW: Partial<Record<PartKey, string>> = { eyes: FACE, mouth: FACE, mark: FACE, face: FACE, extra: FACE, item: FACE, hair: HEAD, tie: HEAD, outfit: CHEST, festive: WHOLE, kit: WHOLE };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const partOf = (key: PartKey) => PARTS.find((p) => p.key === key)!;
/** Each mood as the eye and mouth positions it sets. */
const MOOD_SETS = MOODS.map((m) => ({ name: m.name as string, eyes: partOf('eyes').names.indexOf(m.eyes), mouth: partOf('mouth').names.indexOf(m.mouth) }));

type Props = { id: string; handle: string; code: string | null | undefined; onSaved: () => void };

/** The parts whose choices are put in order by the answer to "Who are we dressing?". Nothing is ever left out. */
const ORDERED: readonly PartKey[] = ['hair', 'outfit'];

type EditorProps = {
  /** What a starter is drawn from when there is no design yet: a handle, or a guest's seed. */
  seed: string;
  code: string | null | undefined;
  /** The answer to the outfit question, or null when there is none. */
  look: LookChoice | null;
  /** Keep the design. Resolves false when it could not be saved. */
  onSave: (code: string) => Promise<boolean>;
  /** Keep the answer. Resolves false when it could not be saved. */
  onLook: (look: LookChoice) => Promise<boolean>;
  onClose: () => void;
};

/**
 * The one character editor, in its dialog. Settings opens it for a signed in player; the first minute opens it
 * for a guest, whose design is kept in the browser. Where the design goes is the caller's business.
 */
export function CharacterEditor({ open, ...editor }: EditorProps & { open: boolean }) {
  return (
    <Dialog open={open} onClose={editor.onClose} label="Edit your character" variant="editor">
      {open && <Editor {...editor} />}
    </Dialog>
  );
}

/** Settings: your character as it is now, and the way into the editor. */
export function AvatarDesigner({ id, handle, code, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  // This browser's copy, filled from the account when the profile loads. Null: never answered.
  const [look, setLook] = useState<LookChoice | null>(loadLook);
  const save = async (next: string) => {
    const ok = await saveAvatar(id, next).catch(() => false);
    if (!ok) return false;
    setAvatarCode(handle, next);
    onSaved();
    return true;
  };
  const chooseLook = async (next: LookChoice) => {
    setLook(next);
    keepLook(next);
    return saveLook(id, next).catch(() => false);
  };
  return (
    <div className={styles.summary}>
      <Avatar handle={handle} size={88} />
      <div className={styles.summaryText}>
        <p className={styles.summaryLine}>This is you on every board, profile and room.</p>
        <div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Icon icon={Pencil} size={16} />
            Edit character
          </Button>
        </div>
      </div>
      <CharacterEditor open={open} seed={handle} code={code} look={look} onSave={save} onLook={chooseLook} onClose={() => setOpen(false)} />
    </div>
  );
}

/**
 * The editor. A stage with the live character, four icon tabs, and one pane of choices. The pane is the only
 * thing that scrolls: the page behind is locked and nothing moves sideways.
 * Saved as a short code, never an image.
 */
function Editor({ seed, code, look, onSave, onLook, onClose }: EditorProps) {
  const [parts, setParts] = useState<Parts>(() => (code ? parseAvatar(code) : avatarFor(seed)));
  const [saved, setSaved] = useState(code ? avatarCode(parseAvatar(code)) : '');
  const [before, setBefore] = useState<Parts | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(TABS[0]!.key);
  // Hair opens on the family the current style belongs to.
  const [family, setFamily] = useState<HairFamily>(() => HAIR_STYLES[parts.hair]!.family);
  const dirty = avatarCode(parts) !== saved;
  // What the detective pieces are earned against: cases closed in this browser, and points from the account.
  const [points, setPoints] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchPoints(seed).then((n) => alive && setPoints(n ?? 0), () => {});
    return () => {
      alive = false;
    };
  }, [seed]);
  const standing = useMemo(() => {
    const done = doneClues();
    return { cases: games.filter((g) => done.has(g.id)).length, points };
  }, [points]);
  const current = TABS.find((t) => t.key === tab)!;

  const choose = (key: PartKey, i: number) => {
    setNote('');
    setBefore(null);
    setParts({ ...parts, [key]: i });
  };
  // A fresh take on the same person (see `surprise`), with one step back in case the old one was better.
  const shuffle = () => {
    const next = surprise(parts, Math.random, look);
    setNote('');
    setBefore(parts);
    setParts(next);
    setFamily(HAIR_STYLES[next.hair]!.family);
  };
  const undo = () => {
    if (!before) return;
    setParts(before);
    setFamily(HAIR_STYLES[before.hair]!.family);
    setBefore(null);
  };
  const save = async () => {
    setBusy(true);
    const next = avatarCode(parts);
    const ok = await onSave(next).catch(() => false);
    setBusy(false);
    if (!ok) return setNote('Could not save. Try again.');
    setSaved(next);
    setBefore(null);
    setNote('Saved. This is you on every board.');
  };
  const dress = async (next: LookChoice) => {
    setNote('');
    const ok = await onLook(next).catch(() => false);
    setNote(ok ? 'Saved. Your choices are in a new order.' : 'Could not save. Try again.');
  };

  // Left and right arrows move between tabs, as in any tab list.
  const tabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(TABS.indexOf(current) + step + TABS.length) % TABS.length]!;
    setTab(next.key);
    e.currentTarget.querySelector<HTMLElement>(`[data-tab="${next.key}"]`)?.focus();
  };

  return (
    <div className={styles.editor}>
      {/* The stage wears the chosen background, so the character sits in its own colour. */}
      <div className={styles.stage} style={{ background: BACKS[parts.back] }} data-dark={parts.back === 1 || undefined}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close the editor">
          <Icon icon={X} size={18} />
        </button>
        <Avatar parts={parts} size={168} className={styles.hero} />
        <div className={styles.quick}>
          <button type="button" className={styles.round} onClick={shuffle} aria-label="Surprise me" title="Surprise me">
            <Icon icon={Dices} size={20} />
          </button>
          <button type="button" className={styles.round} onClick={undo} disabled={!before} aria-label="Undo" title="Undo">
            <Icon icon={Undo2} size={20} />
          </button>
        </div>
      </div>

      <div className={styles.side}>
        <div className={styles.tabs} role="tablist" aria-label="Parts of your character" onKeyDown={tabKey}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`avatar-tab-${t.key}`}
              data-tab={t.key}
              aria-selected={t.key === tab}
              aria-controls="avatar-panel"
              tabIndex={t.key === tab ? 0 : -1}
              className={styles.tab}
              onClick={() => setTab(t.key)}
            >
              <Icon icon={t.icon} size={20} />
              {t.title}
            </button>
          ))}
        </div>

        {/* Keyed by tab, so each one opens at its top. This pane is the editor's only scroll. */}
        <div key={tab} className={styles.pane} role="tabpanel" id="avatar-panel" aria-labelledby={`avatar-tab-${tab}`} tabIndex={0}>
          {tab === 'face' && (
            <section className={styles.group} aria-label="Mood">
              <h3 className={styles.groupTitle}>
                Mood
                <span className={styles.chosen}>Sets the eyes and mouth together</span>
              </h3>
              <div className={styles.tiles}>
                {MOOD_SETS.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    className={styles.tile}
                    aria-pressed={parts.eyes === m.eyes && parts.mouth === m.mouth}
                    aria-label={`Mood: ${cap(m.name)}`}
                    onClick={() => {
                      setNote('');
                      setBefore(null);
                      setParts({ ...parts, eyes: m.eyes, mouth: m.mouth });
                    }}
                  >
                    <Avatar parts={{ ...parts, eyes: m.eyes, mouth: m.mouth }} size={72} view={FACE} tile />
                    <span className={styles.tileName}>{cap(m.name)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {tab === 'wear' && (
            <section className={styles.group} aria-label="Who are we dressing?">
              <h3 className={styles.groupTitle}>
                Who are we dressing?
                <span className={styles.chosen}>Only you see this</span>
              </h3>
              <div className={styles.chips}>
                {LOOK_CHOICES.map((c) => (
                  <button key={c.value} type="button" className={styles.chip} aria-pressed={c.value === look} onClick={() => void dress(c.value)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <p className={styles.help}>So we pick hair and outfits that suit you. Change it any time.</p>
            </section>
          )}
          {current.parts.map((key) => {
            const part = partOf(key);
            const swatches = SWATCHES[key];
            // The answer to the outfit question puts the choices that suit it first. Every choice is still here.
            const order = ORDERED.includes(key) ? orderFor(key, look) : part.names.map((_, i) => i);
            const shown = order.map((i) => ({ name: part.names[i]!, i })).filter(({ i }) => key !== 'hair' || HAIR_STYLES[i]!.family === family);
            return (
              <section key={key} className={styles.group} aria-label={part.title}>
                <h3 className={styles.groupTitle}>
                  {part.title}
                  <span className={styles.chosen}>{cap(part.names[parts[key]]!)}</span>
                </h3>

                {key === 'hair' && (
                  <div className={styles.chips} role="group" aria-label="Kind of hair">
                    {HAIR_FAMILIES.map((f) => (
                      <button key={f.key} type="button" className={styles.chip} aria-pressed={f.key === family} onClick={() => setFamily(f.key)}>
                        {f.title}
                      </button>
                    ))}
                  </div>
                )}

                <div className={swatches ? styles.dots : styles.tiles}>
                  {shown.map(({ name, i }) => {
                    const on = parts[key] === i;
                    // An earned piece not yet earned: shown, so the prize is in sight, and not for choosing.
                    const need = needOf(key, name);
                    const locked = !!need && !on && !isEarned(need, standing);
                    const label = `${part.title}: ${cap(name)}${locked ? `. Locked. ${howTo(need)}` : ''}`;
                    return swatches ? (
                      <button key={name} type="button" className={styles.dot} style={{ background: swatches[i] }} aria-pressed={on} aria-label={label} title={cap(name)} onClick={() => choose(key, i)}>
                        {on && <Icon icon={Check} size={18} className={styles.dotCheck} />}
                      </button>
                    ) : (
                      <button key={name} type="button" className={styles.tile} aria-pressed={on} aria-disabled={locked || undefined} data-locked={locked || undefined} aria-label={label} onClick={() => !locked && choose(key, i)}>
                        <Avatar parts={{ ...parts, [key]: i }} size={72} view={VIEW[key]} tile />
                        <span className={styles.tileName}>
                          {locked && <Icon icon={Lock} size={16} />}
                          {locked ? howTo(need) : cap(name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className={styles.foot}>
          <p className={styles.note} role="status">
            {note || (dirty ? 'Not saved yet.' : '')}
          </p>
          <Button variant="secondary" onClick={onClose}>
            {dirty ? 'Cancel' : 'Done'}
          </Button>
          <Button onClick={save} disabled={busy || !dirty}>
            Keep this look
          </Button>
        </div>
      </div>
    </div>
  );
}

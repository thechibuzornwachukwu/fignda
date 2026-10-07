import { useState, type KeyboardEvent } from 'react';
import { avatarCode, avatarFor, parseAvatar, PARTS, type Avatar as Parts, type PartKey } from '../avatar/draw';
import { setAvatarCode } from '../avatar/store';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { saveAvatar } from '../lib/api';
import { prefersReducedMotion } from '../lib/media';
import styles from './AvatarDesigner.module.css';

/** The order a face is built in. Any part not listed here still shows, after these. */
const ORDER: PartKey[] = ['skin', 'hair', 'colour', 'eyes', 'mouth', 'face', 'mark', 'extra', 'item', 'tie', 'outfit', 'back'];
const rank = (key: PartKey) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length);
const GROUPS = [...PARTS].sort((x, y) => rank(x.key) - rank(y.key));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Props = { id: string; handle: string; code: string | null | undefined; onSaved: () => void };

/**
 * Design your character. The preview stays put, the parts are tabs you swipe through, and each tab is one
 * grid of named choices that scrolls on its own, so the page never moves while you pick.
 * Saved as a short code, never an image.
 */
export function AvatarDesigner({ id, handle, code, onSaved }: Props) {
  const [parts, setParts] = useState<Parts>(() => (code ? parseAvatar(code) : avatarFor(handle)));
  const [saved, setSaved] = useState(code ? avatarCode(parseAvatar(code)) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<PartKey>(GROUPS[0]!.key);
  const dirty = avatarCode(parts) !== saved;
  const group = GROUPS.find((g) => g.key === tab)!;

  const save = async () => {
    setBusy(true);
    const next = avatarCode(parts);
    const ok = await saveAvatar(id, next).catch(() => false);
    setBusy(false);
    if (!ok) return setNote('Could not save. Try again.');
    setSaved(next);
    setAvatarCode(handle, next);
    setNote('Saved. This is you on every board.');
    onSaved();
  };

  const surprise = () => {
    setNote('');
    setParts(avatarFor(`${handle}${Math.random()}`));
  };

  // Left and right arrows move between tabs, as in any tab list.
  const tabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = GROUPS[(GROUPS.indexOf(group) + step + GROUPS.length) % GROUPS.length]!;
    setTab(next.key);
    e.currentTarget.querySelector<HTMLElement>(`[data-tab="${next.key}"]`)?.focus();
  };

  return (
    <div className={styles.designer}>
      <div className={styles.stage}>
        <Avatar parts={parts} size={120} />
        <div className={styles.stageSide}>
          <div className={styles.stageActions}>
            <Button onClick={save} disabled={busy || !dirty}>
              Keep this look
            </Button>
            <Button variant="secondary" onClick={surprise}>
              Surprise me
            </Button>
          </div>
          <p className={styles.note} role="status">
            {note}
          </p>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Parts of your character" onKeyDown={tabKey}>
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            id={`avatar-tab-${g.key}`}
            data-tab={g.key}
            aria-selected={g.key === tab}
            aria-controls="avatar-panel"
            tabIndex={g.key === tab ? 0 : -1}
            className={styles.tab}
            onClick={(e) => {
              setTab(g.key);
              // Keep the chosen tab in view in the sideways strip, without moving the page.
              e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
            }}
          >
            {g.title}
          </button>
        ))}
      </div>

      {/* Keyed by tab, so each category opens scrolled to its top. */}
      <div key={group.key} className={styles.panel} role="tabpanel" id="avatar-panel" aria-labelledby={`avatar-tab-${group.key}`} tabIndex={0}>
        {group.names.map((name, i) => (
          <button
            key={name}
            type="button"
            className={styles.option}
            aria-pressed={parts[group.key] === i}
            aria-label={`${group.title}: ${cap(name)}`}
            onClick={() => {
              setNote('');
              setParts({ ...parts, [group.key]: i });
            }}
          >
            <Avatar parts={{ ...parts, [group.key]: i }} size={56} />
            <span className={styles.optionName}>{cap(name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

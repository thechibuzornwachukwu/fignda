import { useEffect, useMemo, useState } from 'react';
import { Lock, Pencil } from 'lucide-react';
import { avatarCode, avatarFor, parseAvatar, PARTS, type Avatar as Parts } from '../avatar/draw';
import { EARNED, howTo, isEarned, type Standing } from '../avatar/earned';
import { guestAvatar, guestAvatarCode, guestSeed, setGuestAvatarCode } from '../avatar/guest';
import { setAvatarCode } from '../avatar/store';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { LevelBadge } from '../components/LevelBadge';
import { PageHeader } from '../components/PageHeader';
import { Partner } from '../components/Partner';
import { TextLink } from '../components/TextLink';
import { nextAt, nextBondAt, partnerName, PARTNERS, standingOf, type PartnerId } from '../engine/partners';
import { doneClues } from '../games/caseFile';
import { games } from '../games/catalog';
import { saveAvatar, saveLook } from '../lib/api';
import { useAuth } from '../lib/auth';
import { keepLook, loadLook } from '../lib/firstMinute';
import type { LookChoice } from '../lib/onboarding';
import { choosePartner, syncPartner, usePartner } from '../lib/partner';
import { CharacterEditor } from './AvatarDesigner';
import styles from './Me.module.css';

const num = (n: number) => n.toLocaleString('en-US');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const indexOf = (key: 'kit' | 'outfit', name: string) => (PARTS.find((p) => p.key === key)!.names as readonly string[]).indexOf(name);

/** Detective gear, in the order it is offered: nothing, then every earned piece. */
const GEAR = [{ part: 'kit' as const, name: 'none', need: undefined }, ...EARNED];
type Gear = (typeof GEAR)[number];
/** What is being tried on the stage, before it is chosen. */
type Trying = { kind: 'partner'; id: PartnerId } | { kind: 'gear'; gear: Gear } | null;

const wearing = (parts: Parts, g: Gear) => parts[g.part] === indexOf(g.part, g.name);
const wear = (parts: Parts, g: Gear): Parts => ({ ...parts, [g.part]: indexOf(g.part, g.name) });

/**
 * /me. The player's detective and partner on a stage, and under it the partners and the detective gear as rows
 * to swipe. Tap one to try it on the stage; one button under the stage chooses it. Guests too: what they choose
 * is kept in the browser and moves to the account on sign in.
 */
export function Me() {
  const auth = useAuth();
  const profile = auth.profile;
  const partner = usePartner();
  const [trying, setTrying] = useState<Trying>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [look, setLook] = useState<LookChoice | null>(loadLook);
  // A guest's design lives in the browser. Bumped when it changes, so the stage draws it again.
  const [guestRev, setGuestRev] = useState(0);

  // Points move with play: read the account's count each time the stage is opened.
  useEffect(() => {
    if (profile) void syncPartner();
  }, [profile]);

  const code = profile ? profile.avatar : guestAvatarCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `guestRev` is the reason to read the guest's design again
  const mine: Parts = useMemo(() => (profile ? (profile.avatar ? parseAvatar(profile.avatar) : avatarFor(profile.handle)) : guestAvatar()), [profile, guestRev]);
  const standing: Standing = useMemo(() => {
    const done = doneClues();
    return { cases: games.filter((g) => done.has(g.id)).length, points: partner.points };
  }, [partner.points]);

  const keep = async (next: string): Promise<boolean> => {
    if (!profile) {
      setGuestAvatarCode(next);
      setGuestRev((v) => v + 1);
      return true;
    }
    const ok = await saveAvatar(profile.id, next).catch(() => false);
    if (!ok) return false;
    setAvatarCode(profile.handle, next);
    await auth.refreshProfile().catch(() => null);
    return true;
  };

  const shownPartner = trying?.kind === 'partner' ? trying.id : partner.current;
  const shownParts = trying?.kind === 'gear' ? wear(mine, trying.gear) : mine;

  // What the one button under the stage does, and what it says when there is nothing to do.
  let action: { label: string; run: () => Promise<boolean> } | null = null;
  // The bond: cases closed together, and when the partner next gains a piece of kit.
  const bondLine = (id: PartnerId) => {
    const n = partner.bonds[id] ?? 0;
    const at = nextBondAt(n);
    const together = n === 0 ? '' : n === 1 ? ' 1 case closed together.' : ` ${n} cases closed together.`;
    return `${partnerName(id)} is with you.${together}${at != null ? ` New kit at ${at}.` : ''}`;
  };
  let line = bondLine(partner.current);
  if (trying?.kind === 'partner') {
    const how = standingOf(partner, trying.id, partner.points);
    const at = nextAt(partner);
    if (trying.id === partner.current) line = bondLine(trying.id);
    else if (how === 'locked') line = at == null ? '' : !profile ? `Locked. Sign in and reach ${num(at)} points.` : `Locked. ${num(Math.max(0, at - partner.points))} points to go.`;
    else action = { label: `Select ${partnerName(trying.id)}`, run: () => choosePartner(trying.id, !!profile) };
    // A guest holds 1 partner and can swap it freely.
    if (!profile && trying.id !== partner.current) action = { label: `Select ${partnerName(trying.id)}`, run: () => choosePartner(trying.id, false) };
  } else if (trying?.kind === 'gear') {
    const g = trying.gear;
    const locked = !!g.need && !isEarned(g.need, standing);
    if (wearing(mine, g)) line = g.name === 'none' ? 'No gear on.' : `You are wearing the ${g.name}.`;
    else if (locked) line = `Locked. ${howTo(g.need!)}`;
    else action = { label: g.name === 'none' ? 'Take the gear off' : `Wear the ${g.name}`, run: () => keep(avatarCode(wear(mine, g))) };
  }

  const go = async () => {
    if (!action || busy) return;
    setBusy(true);
    setNote('');
    const ok = await action.run();
    setBusy(false);
    if (ok) setTrying(null);
    else setNote('That did not save. Try again.');
  };

  return (
    <div className={styles.page}>
      <PageHeader title="You" action={profile ? <TextLink to="/settings">Settings</TextLink> : auth.enabled ? <TextLink to="/welcome?from=%2Fme">Sign in</TextLink> : undefined} />

      <section className={styles.stage} aria-label="Your detective and your partner" data-trying={trying?.kind}>
        <div className={styles.cast}>
          <figure className={styles.figure}>
            <Avatar parts={shownParts} size={128} />
            <figcaption className={styles.caption}>{profile?.name ?? 'You'}</figcaption>
          </figure>
          <figure className={styles.figure}>
            <Partner who={shownPartner} moment={trying?.kind === 'partner' ? 'hello' : 'done'} size={128} />
            <figcaption className={styles.caption}>{partnerName(shownPartner)}</figcaption>
          </figure>
        </div>
        {profile && <LevelBadge points={partner.points} size="sm" />}
        <div className={styles.act}>
          {action ? (
            <Button variant="accent" onClick={() => void go()} disabled={busy}>
              {action.label}
            </Button>
          ) : (
            <p className={styles.line} data-stage-line>
              {line}
            </p>
          )}
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Icon icon={Pencil} size={16} />
            Edit character
          </Button>
        </div>
        <p className={styles.note} role="status">
          {note}
        </p>
      </section>

      <section className={styles.section} aria-labelledby="me-partners">
        <h2 id="me-partners" className={styles.h2}>
          Partners
        </h2>
        <ul className={styles.row}>
          {PARTNERS.map((p) => {
            const how = standingOf(partner, p.id, partner.points);
            const on = p.id === partner.current;
            const locked = how === 'locked' && !!profile;
            const at = nextAt(partner);
            const closed = partner.bonds[p.id] ?? 0;
            const bond = closed === 0 ? '' : closed === 1 ? ', 1 case' : `, ${closed} cases`;
            const state = on ? `With you${bond}` : how === 'own' ? `Yours${bond}` : locked && at != null ? `${num(at)} points` : 'Tap to try';
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={styles.card}
                  aria-pressed={shownPartner === p.id}
                  data-locked={locked || undefined}
                  data-on={on || undefined}
                  aria-label={`${p.name}. ${locked ? `Locked. ${state}.` : `${state}.`}`}
                  onClick={() => setTrying({ kind: 'partner', id: p.id })}
                >
                  <Partner who={p.id} moment={locked ? 'asleep' : 'empty'} size={88} />
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.state}>
                    {locked && <Icon icon={Lock} size={16} />}
                    {state}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="me-gear">
        <h2 id="me-gear" className={styles.h2}>
          Detective gear
        </h2>
        <ul className={styles.row}>
          {GEAR.map((g) => {
            const on = wearing(mine, g);
            const locked = !!g.need && !isEarned(g.need, standing);
            const title = g.name === 'none' ? 'No gear' : cap(g.name);
            const state = on ? 'On you' : locked ? howTo(g.need!) : g.need ? 'Yours' : 'Plain';
            return (
              <li key={`${g.part}-${g.name}`}>
                <button
                  type="button"
                  className={styles.card}
                  aria-pressed={trying?.kind === 'gear' ? trying.gear === g : on}
                  data-locked={locked || undefined}
                  data-on={on || undefined}
                  aria-label={`${title}. ${locked ? `Locked. ${state}` : `${state}.`}`}
                  onClick={() => setTrying({ kind: 'gear', gear: g })}
                >
                  <Avatar parts={wear(mine, g)} size={88} tile />
                  <span className={styles.name}>{title}</span>
                  <span className={styles.state}>
                    {locked && <Icon icon={Lock} size={16} />}
                    {state}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className={styles.more}>
        {profile ? (
          <TextLink to={`/u/${profile.handle}`}>Your profile, badges and records</TextLink>
        ) : (
          auth.enabled && (
            <>
              Your detective and partner are kept in this browser. <TextLink to="/welcome?from=%2Fme">Sign in to keep them everywhere</TextLink>
            </>
          )
        )}
      </p>

      <CharacterEditor
        open={editing}
        seed={profile ? profile.handle : guestSeed()}
        code={code}
        look={look}
        onSave={keep}
        onLook={async (next) => {
          setLook(next);
          keepLook(next);
          return profile ? saveLook(profile.id, next).catch(() => false) : true;
        }}
        onClose={() => setEditing(false)}
      />
    </div>
  );
}

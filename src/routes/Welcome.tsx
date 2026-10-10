import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { avatarCode, type Avatar as Parts } from '../avatar/draw';
import { guestAvatar, guestAvatarCode, guestSeed, setGuestAvatarCode } from '../avatar/guest';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Partner } from '../components/Partner';
import { Ring } from '../components/Ring';
import { TextLink } from '../components/TextLink';
import { PARTNERS } from '../engine/partners';
import { today } from '../games/daily';
import { saveProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { keepLook, loadFlow, loadLook, saveFlow } from '../lib/firstMinute';
import { answer, endOf, LOOK_CHOICES, NEUTRAL_NAME, nextStep, progress, suggestName, withTail, type Account, type Answer, type Flow, type LookChoice, type Step } from '../lib/onboarding';
import { choosePartner, usePartner } from '../lib/partner';
import { handleFromName, RESERVED_HANDLES, safeNext } from '../lib/streak';
import { CharacterEditor } from './AvatarDesigner';
import { EmailSignIn, ProfileForm } from './SignIn';
import styles from './Welcome.module.css';

/**
 * /welcome. The first minute for a new player (BUILD_PLAN 3b, SPEC section 6): character, sign in, the outfit
 * question, then a name. One question per screen, each with Skip, and a ring that fills across them.
 * Which step shows is decided by `nextStep` in src/lib/onboarding.ts. An account with a profile never sees one.
 */
export function Welcome() {
  const auth = useAuth();
  const { search } = useLocation();
  const [params] = useSearchParams();
  /** The page that sent the player here (the result they want to keep). An existing account goes back to it. */
  const from = safeNext(params.get('from'), '');
  const asked = params.get('next');
  /** Where a new player ends: the page they asked for, else today's daily. Never a menu. */
  const end = endOf(asked, `/d/${today().n}`);

  const [flow, setFlow] = useState<Flow>(loadFlow);
  const [left, setLeft] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const account: Account = { enabled: auth.enabled, signedIn: !!auth.session, hasProfile: !!auth.profile };
  const step = nextStep(flow, account);

  // A new step is a new screen: say its heading, and start at its top.
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef<Step | null>(null);
  useEffect(() => {
    if (shown.current && step && shown.current !== step) heading.current?.focus();
    shown.current = step;
  }, [step]);

  if (left) return <Navigate to={left} replace />;
  // Still finding out who this is: a stored session, or a profile on its way. Never guess a step meanwhile.
  if (closing || auth.loading || (auth.session && !auth.profile && auth.checking)) return <div className={styles.screen} aria-busy="true" />;
  // An existing player. Back to where they were, with nothing asked.
  if (account.hasProfile) return <Navigate to={from || endOf(asked, '/play')} replace />;
  // Nothing left to ask a guest who has been through it: what they want now is to sign in.
  if (!step) return <Navigate to={auth.enabled && !account.signedIn ? `/signin${from ? `?next=${encodeURIComponent(from)}` : ''}` : end} replace />;

  /** Record an answer. When that was the last question, the flow is over and the player goes on. */
  const advance = (at: Step, how: Answer) => {
    const next = answer(flow, at, how);
    if (nextStep(next, account)) {
      saveFlow(next);
      return setFlow(next);
    }
    saveFlow({ ...next, done: true });
    setLeft(end);
  };

  /** The profile exists now. Move what the guest built to it, then go. */
  const named = async () => {
    setClosing(true);
    saveFlow({ ...answer(flow, 'name', 'done'), done: true });
    await auth.refreshProfile().catch(() => null);
    setLeft(end);
  };

  const p = progress(flow, account);
  const top = (
    <p className={styles.progress}>
      <Ring value={p.value} size={40} label={p.label} />
      <span aria-hidden="true">{p.label}</span>
    </p>
  );
  const skip = (at: Step) => <TextLink onClick={() => advance(at, 'skipped')}>Skip</TextLink>;

  if (step === 'character') {
    return (
      <div className={styles.screen}>
        {top}
        <CharacterStep
          heading={heading}
          onKeep={() => advance('character', 'done')}
          foot={
            <div className={styles.links}>
              {skip('character')}
              {auth.enabled && !account.signedIn && <TextLink to={`/signin${from ? `?next=${encodeURIComponent(from)}` : ''}`}>Already have an account? Sign in</TextLink>}
            </div>
          }
        />
      </div>
    );
  }

  if (step === 'signin') {
    return (
      <div className={styles.screen}>
        {top}
        <EmailSignIn
          next={`/welcome${search}`}
          head={
            <div className={styles.head}>
              <h1 ref={heading} tabIndex={-1} className={styles.title}>
                Sign in to keep it.
              </h1>
              <p className={styles.lead}>Your character and your score go with you, on any device. We send a code to your email. No password.</p>
            </div>
          }
        />
        <div className={styles.links}>{skip('signin')}</div>
      </div>
    );
  }

  if (step === 'look') {
    const choose = (look: LookChoice) => {
      keepLook(look);
      advance('look', 'done');
    };
    return (
      <div className={styles.screen}>
        {top}
        <div className={styles.head}>
          <h1 ref={heading} tabIndex={-1} className={styles.title}>
            We believe you should look good.
          </h1>
        </div>
        <fieldset className={styles.choices}>
          <legend className={styles.question}>Who are we dressing?</legend>
          {LOOK_CHOICES.map((c) => (
            <Button key={c.value} variant="secondary" className={styles.choice} onClick={() => choose(c.value)}>
              {c.label}
            </Button>
          ))}
        </fieldset>
        <p className={styles.lead}>So we pick hair and outfits that suit you. Change it any time.</p>
        <div className={styles.links}>{skip('look')}</div>
      </div>
    );
  }

  // The name, last. Only ever reached signed in.
  const user = auth.session?.user;
  if (!user) return <Navigate to={end} replace />;
  return (
    <div className={styles.screen}>
      {top}
      <NameStep
        userId={user.id}
        suggested={suggestName({ fullName: user.user_metadata?.full_name ?? user.user_metadata?.name, email: auth.email })}
        heading={heading}
        onSaved={named}
        onGiveUp={() => setLeft(end)}
      />
    </div>
  );
}

type HeadingRef = RefObject<HTMLHeadingElement | null>;

/** Step 1. The character as it is now, the way into the editor, and one button to keep it. */
function CharacterStep({ heading, onKeep, foot }: { heading: HeadingRef; onKeep: () => void; foot: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(guestAvatarCode);
  const [look, setLook] = useState<LookChoice | null>(loadLook);
  // Their design, else the starter drawn from this browser's seed. Never an empty circle.
  const [parts, setParts] = useState<Parts>(guestAvatar);
  const partner = usePartner();

  return (
    <>
      <div className={styles.head}>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>
          This is you.
        </h1>
        <p className={styles.lead}>Your character on every board, profile and room. Keep it or change it any time.</p>
      </div>
      <div className={styles.character}>
        <Avatar parts={parts} size={120} />
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Icon icon={Pencil} size={16} />
          Change it
        </Button>
      </div>
      {/* The partner who works every case beside them. One tap, free. Left alone, it is Detective X. */}
      <fieldset className={styles.partners}>
        <legend className={styles.partnerAsk}>And your partner. Pick 1, change it any time.</legend>
        {PARTNERS.map((p) => (
          <button key={p.id} type="button" className={styles.partner} aria-pressed={p.id === partner.current} onClick={() => void choosePartner(p.id, false)}>
            <Partner who={p.id} moment="hello" size={72} />
            <span>{p.name}</span>
          </button>
        ))}
      </fieldset>
      <Button
        variant="accent"
        className={styles.full}
        onClick={() => {
          // Keeping the starter makes it theirs, so it does not change if the seed ever does.
          if (!code) setGuestAvatarCode(avatarCode(parts));
          onKeep();
        }}
      >
        Keep this look
      </Button>
      {foot}
      <CharacterEditor
        open={open}
        seed={guestSeed()}
        code={code}
        look={look}
        onSave={async (next) => {
          setGuestAvatarCode(next);
          setCode(next);
          setParts(guestAvatar());
          return true;
        }}
        onLook={async (next) => {
          keepLook(next);
          setLook(next);
          return true;
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

type NameProps = { userId: string; suggested: string; heading: HeadingRef; onSaved: () => Promise<void>; onGiveUp: () => void };

/** Step 4. Name and @handle, prefilled: one tap accepts. Skip gives a neutral name, said on the screen first. */
function NameStep({ userId, suggested, heading, onSaved, onGiveUp }: NameProps) {
  // Worked out once, so the fields do not change under the player.
  const [first] = useState(() => {
    const h = handleFromName(suggested);
    return { name: suggested, handle: h.length >= 2 && !RESERVED_HANDLES.includes(h) ? h : withTail(h) };
  });
  const [neutral] = useState(() => withTail(NEUTRAL_NAME));
  const [busy, setBusy] = useState(false);

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    // A few tries in case the tail is taken. If nothing saves, the player still goes on to play, and is asked next time.
    for (const handle of [neutral, withTail(NEUTRAL_NAME), withTail(NEUTRAL_NAME)]) {
      const res = await saveProfile({ id: userId, name: NEUTRAL_NAME, handle }, false).catch(() => 'failed' as const);
      if (!res) return onSaved();
      if (res !== 'taken') break;
    }
    onGiveUp();
  };

  return (
    <ProfileForm
      userId={userId}
      exists={false}
      name={first.name}
      handle={first.handle}
      suggest
      submit="Start finding"
      head={
        <div className={styles.head}>
          <h1 ref={heading} tabIndex={-1} className={styles.title}>
            What should
            <br />
            we call you?
          </h1>
          <p className={styles.lead}>This shows on boards and on cards you share. Change it any time.</p>
        </div>
      }
      foot={
        <div className={styles.links}>
          <TextLink onClick={() => void skip()}>Skip</TextLink>
          <span className={styles.aside}>Skip and you are @{neutral} for now.</span>
        </div>
      }
      onSaved={onSaved}
    />
  );
}

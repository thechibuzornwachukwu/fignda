import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { TabBar } from './components/TabBar';
import { useDelayedWaiting } from './components/useDelayedWaiting';
import { Waiting } from './components/Waiting';
import { hasTabBar } from './lib/routes';
import { Landing } from './routes/Landing';
import { OpenByCode } from './routes/OpenByCode';
import { prefersReducedMotion } from './lib/media';
import styles from './App.module.css';

// Landing loads first and alone; every other screen is fetched when visited.
const Games = lazy(() => import('./routes/Games').then((m) => ({ default: m.Games })));
const GameById = lazy(() => import('./routes/Game').then((m) => ({ default: m.GameById })));
const PassageById = lazy(() => import('./routes/Game').then((m) => ({ default: m.PassageById })));
const DailyGame = lazy(() => import('./routes/Game').then((m) => ({ default: m.DailyGame })));
const GameByCode = lazy(() => import('./routes/Game').then((m) => ({ default: m.GameByCode })));
const SignIn = lazy(() => import('./routes/SignIn').then((m) => ({ default: m.SignIn })));
const Account = lazy(() => import('./routes/Account').then((m) => ({ default: m.Account })));
const Profile = lazy(() => import('./routes/Profile').then((m) => ({ default: m.Profile })));
const Settings = lazy(() => import('./routes/Settings').then((m) => ({ default: m.Settings })));
const Me = lazy(() => import('./routes/Me').then((m) => ({ default: m.Me })));
const Leaderboard = lazy(() => import('./routes/Leaderboard').then((m) => ({ default: m.Leaderboard })));
const GameLeaderboard = lazy(() => import('./routes/Leaderboard').then((m) => ({ default: m.GameLeaderboard })));
const Players = lazy(() => import('./routes/Players').then((m) => ({ default: m.Players })));
const Circles = lazy(() => import('./routes/Circles').then((m) => ({ default: m.Circles })));
const Circle = lazy(() => import('./routes/Circles').then((m) => ({ default: m.Circle })));
const Answers = lazy(() => import('./routes/Answers').then((m) => ({ default: m.Answers })));
const Notifications = lazy(() => import('./routes/Notifications').then((m) => ({ default: m.Notifications })));
const OwnerPuzzles = lazy(() => import('./routes/OwnerPuzzles').then((m) => ({ default: m.OwnerPuzzles })));
const Make = lazy(() => import('./routes/Make').then((m) => ({ default: m.Make })));
const StreakInvite = lazy(() => import('./routes/StreakInvite').then((m) => ({ default: m.StreakInvite })));
const Welcome = lazy(() => import('./routes/Welcome').then((m) => ({ default: m.Welcome })));
const Privacy = lazy(() => import('./routes/Privacy').then((m) => ({ default: m.Privacy })));

// Test-only card harness. VITE_E2E is set only by the e2e build, so production compiles this away.
const CardsHarness = import.meta.env.VITE_E2E === '1' ? lazy(() => import('./routes/CardsHarness').then((m) => ({ default: m.CardsHarness }))) : null;
const OgHarness = import.meta.env.VITE_E2E === '1' ? lazy(() => import('./routes/CardsHarness').then((m) => ({ default: m.OgHarness }))) : null;

const blank = <div className={styles.loading} aria-busy="true" />;

/** A page that is still being fetched. Blank for the first second, then the waiting screen. */
function SlowLoad() {
  return useDelayedWaiting(true) ? <Waiting size="full" /> : blank;
}

function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, [pathname, hash]);

  return (
    <>
      <Header />
      <main className={[pathname === '/' ? styles.bleed : styles.main, hasTabBar(pathname) && styles.tabbed].filter(Boolean).join(' ')}>
        {/* Keyed by page: a link is a transition, and a transition keeps the old page up and never shows a fallback. */}
        <Suspense key={pathname} fallback={<SlowLoad />}>
          <Outlet />
        </Suspense>
      </main>
      {pathname === '/' && <Footer />}
      <TabBar />
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="play" element={<Games />} />
        <Route path="play/:id" element={<GameById />} />
        <Route path="play/:id/:n" element={<PassageById />} />
        <Route path="d/:n" element={<DailyGame />} />
        <Route path="d/:n/answers" element={<Answers />} />
        <Route
          path="p/:code"
          element={
            <OpenByCode blank={blank}>
              <GameByCode />
            </OpenByCode>
          }
        />
        <Route path="signin" element={<SignIn />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="account" element={<Account />} />
        <Route path="u/:handle" element={<Profile />} />
        <Route path="me" element={<Me />} />
        <Route path="settings" element={<Settings />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="leaderboard/:id" element={<GameLeaderboard />} />
        <Route path="players" element={<Players />} />
        <Route path="circles" element={<Circles />} />
        <Route path="c/:code" element={<Circle />} />
        <Route path="s/:code" element={<StreakInvite />} />
        <Route path="make" element={<Make />} />
        <Route path="owner/puzzles" element={<OwnerPuzzles />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {OgHarness && (
        <Route
          path="__og"
          element={
            <Suspense>
              <OgHarness />
            </Suspense>
          }
        />
      )}
      {CardsHarness && (
        <Route
          path="__cards"
          element={
            <Suspense>
              <CardsHarness />
            </Suspense>
          }
        />
      )}
    </Routes>
  );
}

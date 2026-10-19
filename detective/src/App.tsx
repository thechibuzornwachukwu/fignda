import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { useDelayedWaiting } from './components/useDelayedWaiting';
import { Waiting } from './components/Waiting';
import { hasTabBar, isStep } from './lib/routes';
import { Landing } from './routes/Landing';
import styles from './App.module.css';

// The landing page loads first and alone; every other screen is fetched when visited.
const Cases = lazy(() => import('./routes/Cases').then((m) => ({ default: m.Cases })));
const Brief = lazy(() => import('./routes/Brief').then((m) => ({ default: m.Brief })));
const Step = lazy(() => import('./routes/Step').then((m) => ({ default: m.Step })));
const Notebook = lazy(() => import('./routes/Notebook').then((m) => ({ default: m.Notebook })));
// The 3D street lab: development only, so three.js never reaches a player's download from here.
const StreetLab = import.meta.env.DEV ? lazy(() => import('./routes/StreetLab').then((m) => ({ default: m.StreetLab }))) : null;
const Ranks = lazy(() => import('./routes/Ranks').then((m) => ({ default: m.Ranks })));
const SignIn = lazy(() => import('./routes/SignIn').then((m) => ({ default: m.SignIn })));
const Settings = lazy(() => import('./routes/Settings').then((m) => ({ default: m.Settings })));
const Privacy = lazy(() => import('./routes/Privacy').then((m) => ({ default: m.Privacy })));

const blank = <div className={styles.loading} aria-busy="true" />;

/** A page that is still being fetched. Blank for the first second, then the waiting screen. */
function SlowLoad() {
  return useDelayedWaiting(true) ? <Waiting size="full" /> : blank;
}

function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      {/* A step has the whole screen: its own way back is the way out. */}
      {!isStep(pathname) && <Header />}
      <main className={[pathname === '/' ? styles.bleed : styles.main, hasTabBar(pathname) && styles.tabbed].filter(Boolean).join(' ')}>
        <Suspense key={pathname} fallback={<SlowLoad />}>
          <Outlet />
        </Suspense>
      </main>
      <TabBar />
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="cases" element={<Cases />} />
        <Route path="case/:id" element={<Brief />} />
        <Route path="case/:id/:n" element={<Step />} />
        {/* A closed case worked again, with no tip-offs: the same screens, with stars of their own. */}
        <Route path="cold/:id" element={<Brief />} />
        <Route path="cold/:id/:n" element={<Step />} />
        <Route path="notebook" element={<Notebook />} />
        {StreetLab && <Route path="__street" element={<StreetLab />} />}
        <Route path="ranks" element={<Ranks />} />
        <Route path="signin" element={<SignIn />} />
        <Route path="settings" element={<Settings />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

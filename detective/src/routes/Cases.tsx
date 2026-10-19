import { lazy, Suspense } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SkeletonGroup } from '../components/Skeleton';
import { Casebook } from './Casebook';
import styles from './Cases.module.css';

// three.js comes with the map only, so the rest of the game never waits for it.
const isNight = () => {
  const h = new Date().getHours();
  return h < 6 || h >= 18;
};
const StreetMap = lazy(() => import('./StreetMap').then((m) => ({ default: m.StreetMap })));

/** /cases. The street with each case pinned at its place, then the casebook: every case in order on 1 path, the one being worked open, and the next casebook shut. */
export function Cases() {
  return (
    <div className={styles.screen}>
      <PageHeader title="Cases" />
      <Suspense
        fallback={
          // While three.js loads, the street as a photograph at the same hour, so the screen is never blank.
          <SkeletonGroup className={styles.mapSkeleton}>
            <span className={styles.poster} data-night={isNight() || undefined} />
          </SkeletonGroup>
        }
      >
        <StreetMap />
      </Suspense>
      <Casebook />
    </div>
  );
}

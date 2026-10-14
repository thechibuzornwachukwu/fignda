import { PageHeader } from '../components/PageHeader';
import { Casebook } from './Casebook';
import styles from './Cases.module.css';

/** /cases. The casebook: every case in order on 1 path, the one being worked open, and the next casebook shut. */
export function Cases() {
  return (
    <div className={styles.screen}>
      <PageHeader title="Cases" />
      <Casebook />
    </div>
  );
}

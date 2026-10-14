import { Eye } from 'lucide-react';
import { useMemo } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PartnerNote } from '../components/PartnerNote';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { openEyeFile } from '../engine/openEye';
import { chapters, interludes } from '../games/chapters';
import { loadChapterStars } from '../lib/chapterStore';
import { openCase } from '../lib/firstCase';
import styles from './OpenEye.module.css';

/**
 * /open-eye. The Open Eye file (SPEC section 6, The Open Eye file): every message to the Open Eye a player has read,
 * in the order of the story, each as the card it was found on with what it says under it. One not read yet is a
 * shut card in its place, so the file shows what is still out there without a word.
 */
export function OpenEye() {
  const entries = useMemo(() => openEyeFile(chapters, interludes, (id, n) => (loadChapterStars(id)[n] ?? 0) > 0), []);
  const empty = useMemo(() => pick('eyeEmpty'), []);
  const read = entries.filter((e) => e.read).length;

  if (read === 0)
    return (
      <div className={styles.screen} data-open-eye="empty">
        <PartnerNote moment="empty" layout="screen" title="Nothing filed yet">
          <p>{empty}</p>
          <TextLink to={openCase()?.to ?? '/play'}>Open your case</TextLink>
        </PartnerNote>
      </div>
    );

  return (
    <div className={styles.screen} data-open-eye={read}>
      <PageHeader title="The Open Eye" />
      <ol className={styles.file}>
        {entries.map((e) => (
          <li key={`${e.id}~${e.step}`} className={styles.entry} data-read={e.read || undefined} data-eye={e.id}>
            {e.read ? (
              <>
                <div className={styles.card}>
                  <span className={styles.eye}>
                    <Icon icon={Eye} size={20} />
                  </span>
                  <p className={styles.text}>{e.text}</p>
                  <span className={styles.from}>
                    {e.from === e.place ? e.from : `${e.from} · ${e.place}`}
                  </span>
                </div>
                <p className={styles.says}>{e.says}</p>
              </>
            ) : (
              <div className={styles.shut} role="img" aria-label="A message not read yet">
                <Icon icon={Eye} size={20} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

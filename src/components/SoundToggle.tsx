import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Icon } from './Icon';
import { setSound, soundOn, subscribeSound } from '../lib/sound';
// Same 36 square control as the theme toggle.
import styles from './ThemeToggle.module.css';

/** Mute for the board sounds. A pressed toggle: "Sound, on" or "Sound, off". */
export function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label="Sound"
      aria-pressed={on}
      title={on ? 'Mute sounds' : 'Turn sounds on'}
      onClick={() => setSound(!on)}
    >
      <Icon icon={on ? Volume2 : VolumeX} size={18} />
    </button>
  );
}

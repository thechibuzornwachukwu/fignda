import { useId } from 'react';
import styles from './Segmented.module.css';

type Props<T extends string> = {
  label: string;
  /** Visually hide the label (it stays for screen readers). */
  hideLabel?: boolean;
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
};

/** Track p4 r10 on --surface; options h36 r7 14/700; active --fg on --bg. */
export function Segmented<T extends string>({ label, hideLabel, options, value, onChange }: Props<T>) {
  const id = useId();
  return (
    <div className={styles.wrap}>
      <span id={id} className={hideLabel ? styles.srOnly : styles.label}>
        {label}
      </span>
      <div className={styles.track} role="radiogroup" aria-labelledby={id}>
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === value}
            className={styles.option}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

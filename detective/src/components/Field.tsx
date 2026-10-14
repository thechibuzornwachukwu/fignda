import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import styles from './Field.module.css';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  /** Text shown inside the box before the input, e.g. "@". */
  prefix?: ReactNode;
  size?: 'md' | 'code';
  ref?: Ref<HTMLInputElement>;
};

/** Form input: h52 r8, 1px --line-2 on --surface, focus --line-4. */
export function Field({ label, prefix, size = 'md', id, className, ...rest }: Props) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={size === 'code' ? styles.boxCode : styles.box}>
        {prefix && (
          <span className={styles.prefix} aria-hidden="true">
            {prefix}
          </span>
        )}
        <input id={inputId} className={styles.input} {...rest} />
      </div>
    </div>
  );
}

import styles from './FilterTabs.module.css';

type Props = {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
};

export function FilterTabs({ options, value, onChange, label }: Props) {
  return (
    <div className={styles.tabs} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={styles.tab}
          aria-pressed={o === value}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

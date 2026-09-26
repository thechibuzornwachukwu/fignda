import styles from './Toggle.module.css';

type Props = {
  label: string;
  note?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

/** 44x26 r13 switch. Off --line-2, on --accent. Knob 20. The whole row is the control. */
export function Toggle({ label, note, checked, disabled, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      className={styles.row}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {note && <span className={styles.note}>{note}</span>}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  );
}

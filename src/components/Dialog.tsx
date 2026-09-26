import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Accessible name. */
  label: string;
  children: ReactNode;
};

/**
 * Native modal dialog: the browser traps focus, makes the page inert and restores focus on close.
 * Esc and a click on the scrim close it.
 */
export function Dialog({ open, onClose, label, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // The dialog element itself only receives clicks on the scrim around the panel.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={styles.panel}>{children}</div>
    </dialog>
  );
}

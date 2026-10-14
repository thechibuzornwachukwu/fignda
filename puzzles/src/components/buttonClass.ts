import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'accent' | 'secondary';
export type ButtonSize = 'md' | 'touch' | 'sm';

/** Button look for elements that sit inside another control (e.g. the daily card CTA). */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string): string {
  return [styles.button, styles[variant], size !== 'md' && styles[size], extra].filter(Boolean).join(' ');
}

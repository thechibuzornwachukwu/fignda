import { DEFAULT_TOPIC_ICON } from '../engine/topicIcon';
import { TOPIC_ICONS } from './topicIcons';
import { Icon } from './Icon';
import styles from './TopicIcon.module.css';


/** A puzzle's topic as its icon (BUILD_PLAN set 6b). `--muted`, never lime. An unknown name is the default. */
export function TopicIcon({ name, size = 16, label }: { name: string | null | undefined; size?: 16 | 18 | 20; label?: string }) {
  const icon = TOPIC_ICONS[name ?? ''] ?? TOPIC_ICONS[DEFAULT_TOPIC_ICON]!;
  return (
    <span className={styles.icon} data-topic-icon={name && TOPIC_ICONS[name] ? name : DEFAULT_TOPIC_ICON}>
      <Icon icon={icon} size={size} label={label} />
    </span>
  );
}

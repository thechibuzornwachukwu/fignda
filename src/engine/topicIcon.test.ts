import { icons } from 'lucide-react';
import iconTable from '../../data/topicIcons.json';
import emojiTable from '../../data/topicEmoji.json';
import { DEFAULT_TOPIC_ICON, iconForTopic, topicFromEmoji } from './topicIcon';

const cp = (...n: number[]) => String.fromCodePoint(...n);
const VS16 = cp(0xfe0f);
const ZWJ = cp(0x200d);
const TONE = cp(0x1f3fd);
const FLAG_NG = cp(0x1f1f3, 0x1f1ec);
const FLAG_ENGLAND = cp(0x1f3f4, 0xe0067, 0xe0062, 0xe0065, 0xe006e, 0xe0067, 0xe007f);

describe('topicIcons.json', () => {
  const rows = iconTable.icons;
  const names = [...rows.map((r) => r.icon), iconTable.default];

  it('every icon name exists in the installed lucide-react', () => {
    const missing = names.filter((n) => !(n in icons));
    expect(missing).toEqual([]);
  });

  it('has at least 60 topic words over about 25 icons, and a default', () => {
    expect(rows.flatMap((r) => r.words).length).toBeGreaterThanOrEqual(60);
    expect(new Set(rows.map((r) => r.icon)).size).toBeGreaterThanOrEqual(25);
    expect(iconTable.default).toBeTruthy();
  });

  it('words are lowercase, and each icon appears once', () => {
    for (const r of rows) for (const w of r.words) expect(w, w).toBe(w.toLowerCase().trim());
    expect(new Set(rows.map((r) => r.icon)).size).toBe(rows.length);
  });

  it('covers the subjects the plan names', () => {
    for (const t of ['football', 'music', 'food', 'animals', 'space', 'cars', 'money', 'school', 'faith', 'places', 'people', 'science', 'bible', 'film', 'health', 'weather', 'tech']) {
      expect(iconForTopic(t), t).not.toBe(DEFAULT_TOPIC_ICON);
    }
  });
});

describe('iconForTopic', () => {
  it('matches a word anywhere in the topic, any case, with a plural', () => {
    expect(iconForTopic('Football')).toBe('Goal');
    expect(iconForTopic('Great FOOTBALL moments')).toBe('Goal');
    expect(iconForTopic('foods')).toBe('Utensils');
    expect(iconForTopic('  hip   hop! ')).toBe('Music');
  });

  it('a topic matching two icons gets the first in table order, not the first word typed', () => {
    expect(iconForTopic('music and football')).toBe('Goal');
    expect(iconForTopic('football music')).toBe('Goal');
  });

  it('no match gives the default, never blank', () => {
    for (const t of ['', '   ', 'zzzz qqq', 'a', '42', 'Wetin dey happen', '你好', '...']) {
      expect(iconForTopic(t), JSON.stringify(t)).toBe(DEFAULT_TOPIC_ICON);
    }
  });

  it('does not match inside another word', () => {
    expect(iconForTopic('scarcity')).toBe(DEFAULT_TOPIC_ICON);
    expect(iconForTopic('sunday')).toBe(DEFAULT_TOPIC_ICON);
  });

  it('an emoji topic still gets an icon, never blank', () => {
    expect(iconForTopic('⚽')).toBe('Goal');
    expect(iconForTopic(cp(0x1f3b5))).toBe('Music');
    expect(iconForTopic('🫠')).toBe(DEFAULT_TOPIC_ICON);
  });

  it('a very long topic and a repeated word are fine', () => {
    expect(iconForTopic('music '.repeat(1000))).toBe('Music');
    expect(iconForTopic('x'.repeat(5000))).toBe(DEFAULT_TOPIC_ICON);
  });
});

describe('topicEmoji.json', () => {
  const entries = Object.entries(emojiTable.emoji);

  it('has at least 40 emoji', () => {
    expect(entries.length).toBeGreaterThanOrEqual(40);
  });

  it('keys carry no variation selector, skin tone or joiner', () => {
    for (const [k] of entries) expect(k, k).toBe(k.replace(new RegExp(`[${VS16}${ZWJ}${cp(0x1f3fb)}-${cp(0x1f3ff)}]`, 'gu'), ''));
  });

  it('every emoji means a word that has an icon of its own', () => {
    for (const [k, word] of entries) {
      expect(topicFromEmoji(k), k).toBe(word);
      expect(iconForTopic(word), `${k} ${word}`).not.toBe(DEFAULT_TOPIC_ICON);
    }
    expect(iconForTopic(emojiTable.flag)).not.toBe(DEFAULT_TOPIC_ICON);
  });
});

describe('topicFromEmoji', () => {
  it('reads a listed emoji, with or without its variation selector', () => {
    expect(topicFromEmoji('⚽')).toBe('football');
    expect(topicFromEmoji('✈' + VS16)).toBe('travel');
    expect(topicFromEmoji('✈')).toBe('travel');
  });

  it('ignores skin tone', () => {
    expect(topicFromEmoji(cp(0x1f64f, 0x1f3fd))).toBe('faith');
    expect(topicFromEmoji(cp(0x1f64f))).toBe('faith');
    expect(topicFromEmoji(cp(0x1f3cb) + VS16 + TONE)).toBe('gym');
  });

  it('reads a joined sequence by its parts when the whole is not listed', () => {
    expect(topicFromEmoji(cp(0x1f469, 0x1f3fd) + ZWJ + cp(0x1f52c))).toBe('science');
  });

  it('a flag is a country, any flag', () => {
    expect(topicFromEmoji(FLAG_NG)).toBe('countries');
    expect(topicFromEmoji(cp(0x1f1fa, 0x1f1f8))).toBe('countries');
    expect(topicFromEmoji(FLAG_ENGLAND)).toBe('countries');
    expect(iconForTopic(FLAG_NG)).toBe('MapPin');
  });

  it('an emoji with no entry gives null so the screen can ask', () => {
    expect(topicFromEmoji('🫠')).toBeNull();
    expect(topicFromEmoji('🫠🫠')).toBeNull();
  });

  it('typed words win and come first, emoji add their word', () => {
    expect(topicFromEmoji('jollof ⚽')).toBe('jollof football');
    expect(topicFromEmoji('Naija 🫠')).toBe('Naija');
    expect(topicFromEmoji('⚽  my team')).toBe('my team football');
  });

  it('10 emoji in a row give at most 3 distinct words, and a repeat is one word', () => {
    expect(topicFromEmoji('⚽'.repeat(10))).toBe('football');
    expect(topicFromEmoji('⚽🎵🍕🐶🚀🚗💰🎓🙏🎬')).toBe('football music food');
    expect(topicFromEmoji('🫠'.repeat(10))).toBeNull();
  });

  it('is null when there is no emoji, or nothing at all', () => {
    expect(topicFromEmoji('football')).toBeNull();
    expect(topicFromEmoji('')).toBeNull();
    expect(topicFromEmoji('   ')).toBeNull();
    expect(topicFromEmoji('42')).toBeNull();
    expect(topicFromEmoji('1' + VS16 + cp(0x20e3))).toBeNull();
  });

  it('an unlisted emoji among listed ones is dropped', () => {
    expect(topicFromEmoji('🫠⚽')).toBe('football');
  });
});

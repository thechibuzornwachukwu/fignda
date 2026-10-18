import { readBox, surprise, SURPRISES, TOPIC_MAX } from './makeBox';
import { iconForTopic } from './topicIcon';

// The edge cases BUILD_PLAN set 6 lists: one letter, only spaces, a real name, emoji in every form, Pidgin, 5,000
// characters, the same topic twice.
describe('the one box on Make', () => {
  it('nothing, or only spaces and invisible characters, is Surprise me', () => {
    for (const raw of ['', '   ', '\n\t ', '​‎', '\u0000\u0007']) expect(readBox(raw)).toEqual({ kind: 'empty' });
  });

  it('a word, one letter, a real name or Pidgin is a topic, as typed and tidied', () => {
    expect(readBox('  Lagos   markets ')).toEqual({ kind: 'topic', topic: 'Lagos markets' });
    expect(readBox('a')).toEqual({ kind: 'topic', topic: 'a' });
    expect(readBox('Chinua Achebe')).toEqual({ kind: 'topic', topic: 'Chinua Achebe' });
    expect(readBox('How far, wetin dey happen')).toEqual({ kind: 'topic', topic: 'How far, wetin dey happen' });
  });

  it('the same topic twice reads the same', () => {
    expect(readBox('Football')).toEqual(readBox('Football'));
  });

  it('a known emoji is its word; with words beside it the words come first; skin tones and joiners are read whole', () => {
    expect(readBox('🍲')).toEqual({ kind: 'topic', topic: 'food' });
    expect(readBox('jollof 🍲')).toEqual({ kind: 'topic', topic: 'jollof food' });
    expect(readBox('🍲🍲🍲🍲🍲')).toEqual({ kind: 'topic', topic: 'food' });
    expect(readBox('🇳🇬').kind).toBe('topic');
  });

  it('only emoji we do not know: the box asks', () => {
    expect(readBox('🫥')).toEqual({ kind: 'unknown-emoji' });
  });

  it('60 letters or more is a paragraph, up to 5,000 and past it', () => {
    const p = 'Pat omitted the big old map. It was a most unusual day in Kenya.';
    expect(readBox(p)).toEqual({ kind: 'paragraph', text: p });
    expect(readBox('x'.repeat(5000)).kind).toBe('paragraph');
    // A topic never runs past what the Worker takes.
    expect('x'.repeat(TOPIC_MAX - 1).length).toBeLessThan(60);
  });

  it('Surprise me picks a topic that has an icon of its own', () => {
    expect(surprise(() => 0)).toBe(SURPRISES[0]);
    expect(surprise(() => 0.9999)).toBe(SURPRISES.at(-1));
    for (const t of SURPRISES) expect(iconForTopic(t), t).not.toBe('Shapes');
  });
});

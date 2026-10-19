// A help article (SPEC, Help): one question a player asks, answered in the first 1 or 2 sentences, then the steps.
// Every number in an article is read from the code the game runs, so an article changes when the rule does.

export const HELP_GROUPS = ['Playing', 'Packs and progress', 'Points, ranks and leagues', 'Your pet and your look', 'Friends', 'Making puzzles', 'Your account'] as const;
export type HelpGroup = (typeof HELP_GROUPS)[number];

export type HelpArticle = {
  /** Its address: /help/SLUG. Never renamed once published: links and search results point at it. */
  slug: string;
  group: HelpGroup;
  /** The question, as a player would type it. */
  title: string;
  /** The answer, 1 or 2 sentences. */
  answer: string;
  /** Numbered steps, when the answer is something to do. */
  steps?: readonly string[];
  /** Facts to look up, when the answer is a rule. */
  facts?: readonly string[];
  /** Other articles worth reading next, by slug. */
  related?: readonly string[];
};

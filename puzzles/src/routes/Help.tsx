import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { TextLink } from '../components/TextLink';
import { helpArticle, helpByGroup, searchHelp } from '../help/articles';
import type { HelpArticle } from '../help/types';
import styles from './Help.module.css';

/** /help: the help centre. Search, then the articles by what a player is trying to do. Every article is bundled. */
export function Help() {
  const [query, setQuery] = useState('');
  const groups = helpByGroup(searchHelp(query));

  return (
    <div className={styles.page}>
      <PageHeader title="Help" />
      <input
        type="search"
        className={styles.search}
        aria-label="Search help"
        placeholder="Search help"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {groups.length === 0 ? (
        <p className={styles.none}>Nothing matches that. Try another word.</p>
      ) : (
        groups.map(({ group, articles }) => {
          const id = `help-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          return (
            <section key={group} className={styles.group} aria-labelledby={id}>
              <h2 id={id} className={styles.h2}>
                {group}
              </h2>
              <ul className={styles.list}>
                {articles.map((a) => (
                  <li key={a.slug}>
                    <Link className={styles.item} to={`/help/${a.slug}`}>
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

/** /help/:slug: one article. An unknown slug goes back to the list. */
export function HelpArticlePage() {
  const { slug = '' } = useParams();
  const a = helpArticle(slug);
  if (!a) return <Navigate to="/help" replace />;

  const related = (a.related ?? []).map((s) => helpArticle(s)).filter((x): x is HelpArticle => x !== undefined);

  return (
    <article className={styles.article} data-help={slug}>
      <TextLink to="/help">All help</TextLink>
      <h1 className={styles.title}>{a.title}</h1>
      <p className={styles.answer}>{a.answer}</p>
      {a.steps && a.steps.length > 0 && (
        <ol className={styles.steps}>
          {a.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
      {a.facts && a.facts.length > 0 && (
        <ul className={styles.facts}>
          {a.facts.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      {related.length > 0 && (
        <nav className={styles.related} aria-label="Related">
          {related.map((r) => (
            <Link key={r.slug} to={`/help/${r.slug}`} className={styles.item}>
              {r.title}
            </Link>
          ))}
        </nav>
      )}
    </article>
  );
}

import { catalog, categories, guides } from '@/lib/catalog';
import { markdownHref, origin } from '@/lib/markdown';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

/** An index of the docs for language models, following llmstxt.org. */
export function GET() {
  const href = (slug: string) => `${origin}${markdownHref(source.getPage(slug.split('/').filter(Boolean))!.url)}`;
  const lines = [
    '# Brand Studio UI',
    '',
    '> React components that take their colours, type and shape from a brand contract. Install with `npm install @brand-studio/ui`, import `@brand-studio/ui/styles.css` once and wrap the app in `BrandTheme`.',
    '',
    `Every page below is Markdown. The whole set is in one file at ${origin}/llms-full.txt.`,
    '',
    '## Getting Started',
    ...guides.map((guide) => `- [${guide.title}](${href(guide.slug)})`),
    ...categories.flatMap((category) => ['', `## ${category}`, ...catalog.filter((entry) => entry.category === category).map((entry) => `- [${entry.title}](${href(`components/${entry.slug}`)}): ${entry.description}`)]),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

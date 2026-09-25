import { pageMarkdown } from '@/lib/markdown';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

/** Every docs page as Markdown in one file. */
export async function GET() {
  const pages = await Promise.all(source.getPages().map((page) => pageMarkdown([...page.slugs])));
  return new Response(pages.join('\n---\n\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

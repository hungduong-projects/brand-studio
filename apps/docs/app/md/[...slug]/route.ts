import { pageMarkdown } from '@/lib/markdown';
import { source } from '@/lib/source';

export const dynamic = 'force-static';
export const dynamicParams = false;

export const generateStaticParams = () => source.getPages().map((page) => {
  const slug = page.slugs.length ? [...page.slugs] : ['index'];
  slug[slug.length - 1] += '.md';
  return { slug };
});

export async function GET(_: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const slug = [...(await params).slug];
  slug[slug.length - 1] = slug[slug.length - 1].replace(/\.md$/, '');
  return new Response(await pageMarkdown(slug[0] === 'index' ? [] : slug), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/json-ld';
import { mdxComponents } from '@/components/mdx';
import { Pager, PagerArrows } from '@/components/pager';
import { Toc } from '@/components/toc';
import { markdownHref, origin } from '@/lib/markdown';
import { source } from '@/lib/source';

export const dynamicParams = false;
export const generateStaticParams = () => source.generateParams();

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const page = source.getPage((await params).slug);
  return page ? {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: `${page.url.replace(/\/$/, '')}/`, types: { 'text/markdown': markdownHref(page.url) } },
  } : {};
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const Body = page.data.body;
  const href = page.url.endsWith('/') ? page.url : `${page.url}/`;
  const crumbs = [['Brand Studio UI', '/'], ['Docs', '/docs/'], ...(href === '/docs/' ? [] : [[page.data.title, href]])];
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'TechArticle', headline: page.data.title, description: page.data.description, url: `${origin}${href}`, isPartOf: { '@id': `${origin}/#website` }, about: { '@id': `${origin}/#package` } },
      { '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: `${origin}${path}` })) },
    ],
  };
  return <>
    <JsonLd data={data} />
    <main id="main" tabIndex={-1} className="docs-main">
      <div className="docs-head">
        <div className="docs-head__row">
          <h1>{page.data.title}</h1>
          <PagerArrows href={href} />
        </div>
        {page.data.description && <p className="docs-lead">{page.data.description}</p>}
      </div>
      <div className="prose"><Body components={mdxComponents} /></div>
      <Pager href={href} />
      <footer className="docs-footer">
        <p>Still, Deskhand and Hollis are fictional brands. The coffee photographs are original generated artwork. @brand-studio/ui is MIT licensed.</p>
      </footer>
    </main>
    <aside className="toc-rail"><Toc items={page.data.toc.map(({ title, url, depth }) => ({ title, url, depth }))} /></aside>
  </>;
}

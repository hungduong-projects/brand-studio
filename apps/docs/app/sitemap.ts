import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

const origin = 'https://brandstudio.js.org';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${origin}/` },
    ...source.getPages().map((page) => ({
      url: `${origin}${page.url.replace(/\/$/, '')}/`,
    })),
  ];
}

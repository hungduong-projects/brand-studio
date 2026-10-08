import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/geist';
import '@fontsource/geist-mono/latin-400.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@brand-studio/ui/styles.css';
import './globals.css';
import pkg from '../../../packages/ui/package.json';
import { DemoBrandProvider } from '@/components/demo-brand';
import { JsonLd } from '@/components/json-ld';
import { origin } from '@/lib/markdown';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  metadataBase: new URL('https://brandstudio.js.org'),
  title: { default: 'Brand Studio UI', template: '%s · Brand Studio UI' },
  description: 'React components that take their colours, type and shape from a brand contract.',
  alternates: { canonical: '/' },
};

const site = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: 'Brand Studio UI', description: metadata.description, inLanguage: 'en' },
    {
      '@type': 'SoftwareSourceCode', '@id': `${origin}/#package`, name: pkg.name, version: pkg.version, description: pkg.description,
      url: `${origin}/`, codeRepository: 'https://github.com/hungduong-projects/brand-studio', sameAs: [`https://www.npmjs.com/package/${pkg.name}`],
      programmingLanguage: 'TypeScript', runtimePlatform: 'React 18.3 or 19', license: 'https://opensource.org/licenses/MIT',
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- must run before first paint */}
      <script src="/theme.js" />
      <JsonLd data={site} />
    </head>
    <body>
      <a className="skip" href="#main">Skip to content</a>
      <DemoBrandProvider>
        <SiteHeader />
        {children}
      </DemoBrandProvider>
    </body>
  </html>;
}

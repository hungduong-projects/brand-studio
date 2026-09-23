import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/geist';
import '@fontsource/geist-mono/latin-400.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@brand-studio/ui/styles.css';
import './globals.css';
import { DemoBrandProvider } from '@/components/demo-brand';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  metadataBase: new URL('https://brandstudio.js.org'),
  title: { default: 'Brand Studio UI', template: '%s · Brand Studio UI' },
  description: 'React components that take their colours, type and shape from a brand contract.',
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- must run before first paint */}
      <script src="/theme.js" />
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

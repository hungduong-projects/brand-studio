'use client';

import { NotFoundTerminal } from '@brand-studio/ui';

const links = [
  { href: '/docs', title: 'every guide' },
  { href: '/docs/api', title: 'API reference' },
  { href: '/changelog', title: 'what moved and when' },
];

// The links point at pages of a made-up docs site, so the demo keeps clicks on this page.
export default function NotFoundTerminalDemo() {
  return (
    <div onClickCapture={event => { if ((event.target as HTMLElement).closest('a')) event.preventDefault(); }} style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
      <NotFoundTerminal
        as="h2"
        name="roastery docs"
        path="/docs/api/webhoks"
        links={links}
        pages={['/docs/api/webhooks', '/docs/api/orders', '/docs/getting-started']}
        search="/search"
      />
    </div>
  );
}

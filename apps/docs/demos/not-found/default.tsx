'use client';

import { ActionLink, NotFound } from '@brand-studio/ui';

const pages = ['/', '/shop', '/shop/ethiopia-guji', '/shop/huila-washed', '/shop/house-espresso', '/brew-guides', '/subscriptions'];
const links = [
  { href: '/shop', title: 'Shop', description: 'Every coffee we roast this month.' },
  { href: '/brew-guides', title: 'Brew guides', description: 'Recipes for filter, espresso and cold brew.' },
  { href: '/subscriptions', title: 'Subscriptions', description: 'Fresh bags every two or four weeks.' },
];

// The links point at pages of a made-up shop, so the demo keeps clicks and searches on this page.
export default function NotFoundDemo() {
  return (
    <div onClickCapture={event => { if ((event.target as HTMLElement).closest('a')) event.preventDefault(); }} onSubmitCapture={event => event.preventDefault()} style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
      <NotFound
        as="h2"
        path="/shop/ethiopia-gujii"
        pages={pages}
        links={links}
        search="/search"
        searchLabel="Search coffees"
        action={<ActionLink href="/" tone="secondary">Go to the home page</ActionLink>}
      />
    </div>
  );
}

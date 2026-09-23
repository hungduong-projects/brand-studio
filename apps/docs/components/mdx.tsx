import type { MDXComponents } from 'mdx/types';
import { catalog } from '@/lib/catalog';
import { ownProps } from '@/lib/props';
import { CodeFrame } from './code-frame';
import { Install } from './install';
import { Preview } from './preview';
import { PropsTable } from './props-table';

/** The props table for one export, without the HTML attributes it passes through. */
async function Props({ name }: { name: string }) {
  const entry = catalog.find((item) => item.exports.includes(name));
  const base = entry?.exports[0] === name ? entry.base : undefined;
  return <>
    <PropsTable entries={await ownProps(name, base)} />
    {base && <p className="props-note">Also accepts every <code>{base}</code> attribute.</p>}
  </>;
}

export const mdxComponents: MDXComponents = { pre: CodeFrame, Preview, Install, Props };

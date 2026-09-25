import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { agentPrompt } from './agent-prompt';
import { catalog } from './catalog';
import { ownProps } from './props';
import { source } from './source';

export const origin = 'https://brandstudio.js.org';

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const install = (name?: string) => [
  '```sh\nnpm install @brand-studio/ui\n```',
  'React 18 or 19 is a peer dependency. Import the stylesheet once and wrap the app in a brand theme:',
  "```tsx\nimport '@brand-studio/ui/styles.css';\n" + `import { BrandTheme${name && name !== 'BrandTheme' ? `, ${name}` : ''} } from '@brand-studio/ui';\nimport brand from './brand.json';\n\n<BrandTheme palette={brand.tokens} mode="system">\n  {/* your app */}\n</BrandTheme>\n\`\`\``,
].join('\n\n');

async function props(name: string) {
  const rows = await ownProps(name, catalog.find((entry) => entry.exports[0] === name)?.base);
  return ['| Prop | Type | Default |', '|---|---|---|', ...rows.map((row) => `| \`${row.required ? row.name : `${row.name}?`}\` | \`${cell(row.type)}\` | ${row.defaultValue ? `\`${cell(row.defaultValue)}\`` : '–'} |`)].join('\n');
}

async function replaceAsync(text: string, pattern: RegExp, replace: (...match: string[]) => Promise<string>) {
  const parts = await Promise.all([...text.matchAll(pattern)].map((match) => replace(...match)));
  let index = 0;
  return text.replace(pattern, () => parts[index++]);
}

/** A docs page as plain Markdown: demos become their source, and the install steps and props table become text. */
export async function pageMarkdown(slug: string[]) {
  const page = source.getPage(slug);
  if (!page) throw new Error(`No docs page ${slug.join('/')}`);
  const file = path.join(process.cwd(), 'content', `${slug.length ? slug.join('/') : 'index'}.mdx`);
  let body = (await readFile(file, 'utf8')).replace(/^---\n[\s\S]*?\n---\n/, '').trim();
  body = await replaceAsync(body, /<Preview name="([^"]+)"[^>]*\/>/g, async (_, name) => '```tsx\n' + (await readFile(path.join(process.cwd(), 'demos', `${name}.tsx`), 'utf8')).trimEnd() + '\n```');
  body = await replaceAsync(body, /<Props name="([^"]+)"[^>]*\/>/g, async (_, name) => props(name));
  body = body.replace(/<Install(?: name="([^"]+)")?\s*\/>/g, (_, name) => install(name)).replace(/<AgentPrompt\s*\/>/g, '```text\n' + agentPrompt + '\n```');
  return `# ${page.data.title}\n\n${page.data.description ? `> ${page.data.description}\n\n` : ''}${body}\n\nSource: ${origin}${page.url}/\n`;
}

export const markdownHref = (url: string) => `/md${url.replace(/^\/docs/, '') || '/index'}.md`;

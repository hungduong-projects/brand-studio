import { highlight } from '@/lib/code';
import { CopyButton } from './copy-button';
import { DocsTabs } from './tabs';

const managers = [
  ['pnpm', 'pnpm add @brand-studio/ui'],
  ['npm', 'npm install @brand-studio/ui'],
  ['yarn', 'yarn add @brand-studio/ui'],
  ['bun', 'bun add @brand-studio/ui'],
] as const;

async function Snippet({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return <div className="code-frame"><div className="code" tabIndex={0}>{await highlight(code, lang)}</div><CopyButton text={code} /></div>;
}

/** Command and manual install steps, as tabs. */
export async function Install({ name }: { name?: string }) {
  const command = <DocsTabs label="Package manager" variant="code" tabs={await Promise.all(managers.map(async ([label, code]) => ({ label, content: await Snippet({ code }) })))} />;
  const manual = <ol className="steps">
    <li><h3>Install the peer dependencies</h3><Snippet code="npm install react react-dom" /></li>
    <li><h3>Import the stylesheet once</h3><Snippet lang="tsx" code={"import '@brand-studio/ui/styles.css';"} /></li>
    <li><h3>Wrap your app in a brand theme</h3><Snippet lang="tsx" code={`import { BrandTheme${name && name !== 'BrandTheme' ? `, ${name}` : ''} } from '@brand-studio/ui';\nimport brand from './brand.json';\n\n<BrandTheme palette={brand.tokens} mode="system">\n  {/* your app */}\n</BrandTheme>`} /></li>
  </ol>;
  return <DocsTabs label="Installation method" tabs={[{ label: 'Command', content: command }, { label: 'Manual', content: manual }]} />;
}

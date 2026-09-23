import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { registry } from '@/demos/registry';
import { highlight } from '@/lib/code';
import { DemoTheme } from './demo-brand';
import { PreviewFrame } from './preview-frame';

/** A live demo above its own source. The code shown is the file that runs, read at build time. */
export async function Preview({ name, layout = 'center' }: { name: string; layout?: 'center' | 'full' }) {
  const Demo = registry[name];
  if (!Demo) throw new Error(`No demo named ${name}`);
  const code = (await readFile(path.join(process.cwd(), 'demos', `${name}.tsx`), 'utf8')).trimEnd();
  return <PreviewFrame code={await highlight(code)} raw={code} layout={layout}>
    <DemoTheme className="preview__stage"><Demo /></DemoTheme>
  </PreviewFrame>;
}

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createGenerator, type DocEntry, type GenerateOptions } from 'fumadocs-typescript';
import { isUnionType } from 'typescript/unstable/sync';

const generator = createGenerator({ tsconfigPath: path.join(process.cwd(), 'tsconfig.json') });
const sourceDir = path.join(process.cwd(), '..', '..', 'packages', 'ui', 'src');
const sources = ['core.tsx', 'ai.tsx', 'effects.tsx', 'app.tsx', 'story.tsx'].map(file => readFileSync(path.join(sourceDir, file), 'utf8')).join('\n');

const options: GenerateOptions = {
  transform(entry, type) {
    const values = isUnionType(type) ? type.getTypes().map((member) => this.checker.typeToString(member)).filter((member) => member !== 'undefined') : [];
    if (values.length > 1 && values.every((member) => member.startsWith('"'))) entry.type = values.join(' | ');
    else if (!entry.required) entry.type = entry.type.replace(/ \| undefined$/, '');
  },
};

export interface PropRow extends DocEntry { defaultValue?: string }

/** Defaults come from the destructured parameters in the package source, so the table cannot drift from the code. */
function defaults(name: string) {
  const start = sources.indexOf(`export function ${name}({`);
  if (start < 0) return new Map<string, string>();
  const head = sources.slice(start, sources.indexOf('}', start));
  return new Map([...head.matchAll(/(\w+) = ('[^']*'|-?[\d.]+|true|false)/g)].map(([, key, value]) => [key, value]));
}

export async function ownProps(name: string, base?: string): Promise<PropRow[]> {
  const content = [
    `import type { ${base ? base.split('<')[0] : 'FC'} } from 'react';`,
    `import type { ${name} } from '@brand-studio/ui';`,
    `export type Own = Parameters<typeof ${name}>[0];`,
    base ? `export type Base = ${base};` : '',
  ].join('\n');
  const file = { path: path.join(process.cwd(), 'lib', `.props-${name}.ts`), content };
  const [own] = await generator.generateDocumentation(file, 'Own', options);
  if (!own) throw new Error(`No props generated for ${name}`);
  const found = defaults(name);
  let entries = own.entries;
  if (base) {
    const [inherited] = await generator.generateDocumentation(file, 'Base', options);
    const byName = new Map(inherited.entries.map((entry) => [entry.name, entry]));
    entries = entries.filter((entry) => { const from = byName.get(entry.name); return !from || from.required !== entry.required || from.type !== entry.type; });
  }
  return entries.map((entry) => ({ ...entry, defaultValue: found.get(entry.name) }));
}

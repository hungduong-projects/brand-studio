import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const docs = defineDocs({ dir: 'content' });

export default defineConfig({
  mdxOptions: { rehypeCodeOptions: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false, icon: false } },
});

import { Fragment } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { codeToHast } from 'shiki';

/** Highlight at build time and return React elements, so no HTML string reaches the page. Colours switch with the site mode through CSS variables. */
export async function highlight(code: string, lang = 'tsx') {
  const tree = await codeToHast(code, { lang, themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false });
  return toJsxRuntime(tree, { Fragment, jsx, jsxs });
}

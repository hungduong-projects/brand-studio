/** Builds serve these pages under /examples/ on the docs site; dev serves them from the root. */
export const at = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, '');

/** The public site these pages live on. Links to its home and docs use it so dev builds reach them too. */
export const SITE = 'https://brandstudio.js.org/';

/** The current page without the base or a trailing slash, such as '/camera'. */
export const route = () => '/' + location.pathname.slice(import.meta.env.BASE_URL.length).replace(/\/$/, '');

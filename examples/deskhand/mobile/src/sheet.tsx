import type { ReactNode } from 'react';

/** iOS and Android draw the source as a system sheet (`presentation: 'formSheet'` in app/_layout.tsx). sheet.web.tsx draws one for the web build. */
export function Sheet({ children }: { label: string; children: ReactNode }) {
  return children;
}

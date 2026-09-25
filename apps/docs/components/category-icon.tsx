import { BookOpen, Bot, Clapperboard, Compass, LayoutGrid, Package, Palette, Sparkles, Table2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Category } from '@/lib/catalog';

const icons: Record<Category | 'Getting Started', LucideIcon> = {
  'Getting Started': BookOpen, Foundations: Palette, App: LayoutGrid, Navigation: Compass, Data: Table2,
  'AI agents': Bot, Effects: Sparkles, Storytelling: Clapperboard, 'Product page': Package,
};

/** A group heading with its Lucide icon, shared by the sidebar and the mobile menu. */
export function GroupHeading({ name }: { name: Category | 'Getting Started' }) {
  const Icon = icons[name];
  return <h2 className="group-heading"><Icon aria-hidden="true" size={14} strokeWidth={2} />{name}</h2>;
}

import { EditorialSection } from '@brand-studio/ui';
import { beans } from '@/demos/assets';

export default function EditorialSectionDemo() {
  return (
    <EditorialSection title="Start with the bean." asset={beans}>
      <p>Small differences become the whole cup. We roast in small batches so each lot keeps its own character.</p>
    </EditorialSection>
  );
}

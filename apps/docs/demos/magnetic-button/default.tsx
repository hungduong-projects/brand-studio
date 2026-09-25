import { MagneticButton } from '@brand-studio/ui';
import { ArrowRight } from 'lucide-react';

export default function MagneticButtonDemo() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24, width: '100%', maxWidth: 560, padding: '28px 32px', borderRadius: 20, background: 'var(--bs-elevated)', border: '1px solid var(--bs-line-soft)' }}>
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--bs-muted)' }}>Halden R · ships 14 October</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>From £1,890</p>
      </div>
      <MagneticButton shape="pill">Pre-order <ArrowRight size={16} aria-hidden="true" /></MagneticButton>
    </div>
  );
}

import { PinnedZoom } from '@brand-studio/ui';
import { cup } from '@/demos/assets';

export default function PinnedZoomDemo() {
  return (
    <div style={{ width: '100%' }}>
      <PinnedZoom asset={cup} title="Make room for the first sip.">
        <p style={{ margin: 0 }}>The Huila lot, poured at ninety-four degrees.</p>
      </PinnedZoom>
    </div>
  );
}

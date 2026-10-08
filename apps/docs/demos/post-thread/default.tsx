'use client';

import { PostThread, SocialPost } from '@brand-studio/ui';
import { cup } from '@/demos/assets';

const still = { name: 'Still Coffee', handle: 'stillcoffee', verified: true };

export default function PostThreadDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <PostThread label="Brewing the Huila lot">
        <SocialPost author={still} time="3h" replies={6} reposts={14} likes={312}>Two changes for the Huila lot, from this morning's cupping.</SocialPost>
        <SocialPost author={still} time="3h" replies={2} reposts={9} likes={204}>Grind one step coarser. At our old setting the cup turned bitter by the third minute.</SocialPost>
        <SocialPost author={still} time="3h" media={cup} replies={4} reposts={11} likes={268}>{'Water at 94°C, not boiling. The red fruit holds. #pourover'}</SocialPost>
        <SocialPost author={{ name: 'Maren Holt', handle: 'maren_roasts' }} time="1h" likes={37}>{'@stillcoffee Tried both at home with a cone dripper. Sweeter, less bite.'}</SocialPost>
      </PostThread>
    </div>
  );
}

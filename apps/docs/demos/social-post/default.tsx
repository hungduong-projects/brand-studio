'use client';

import { SocialPost } from '@brand-studio/ui';
import { pour } from '@/demos/assets';

export default function SocialPostDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <SocialPost author={{ name: 'Still Coffee', handle: 'stillcoffee', verified: true }} time="2h" media={pour} replies={18} reposts={42} likes={1280} views={24600}>
        {'The Huila lot rested nine days and it is ready. A pour-over brings out the red fruit: 15 g of coffee, 250 ml of water, about three minutes.\n\nTasting on Saturday at 10:00 with @maren_roasts. #pourover'}
      </SocialPost>
    </div>
  );
}

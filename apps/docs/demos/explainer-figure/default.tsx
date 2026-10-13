'use client';

import { ExplainerFigure } from '@brand-studio/ui';
import replyDesk from './reply-desk.json';

export default function ExplainerFigureDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <ExplainerFigure figure={replyDesk} />
    </div>
  );
}

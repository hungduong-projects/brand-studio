import { Skeleton } from '@brand-studio/ui';

export default function SkeletonDemo() {
  return (
    <div style={{ display: 'grid', gap: 24, width: '100%', maxWidth: 380 }}>
      <Skeleton avatar lines={2} label="Loading your profile" />
      <Skeleton lines={3} label="Loading tasting notes" />
    </div>
  );
}

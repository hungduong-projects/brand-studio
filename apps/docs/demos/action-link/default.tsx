import { ActionLink } from '@brand-studio/ui';

export default function ActionLinkDemo() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <ActionLink href="#menu">See the menu</ActionLink>
      <ActionLink href="#visit" tone="secondary">Plan a visit</ActionLink>
    </div>
  );
}

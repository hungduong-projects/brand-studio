import { Badge, Button, Card } from '@brand-studio/ui';

export default function CardDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <Card
        title="Ethiopia Guji"
        description="Washed, light roast. Peach, jasmine and black tea."
        footer={<><Button>Add to basket</Button><Button tone="secondary">Details</Button></>}
      >
        <div style={{ display: 'flex', gap: 8 }}><Badge>250 g</Badge><Badge tone="outline">Whole bean</Badge></div>
      </Card>
    </div>
  );
}

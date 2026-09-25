import { useStore } from '../../store';
import { TicketRow } from '../../ticket-row';
import { Group, Screen, Section, T } from '../../ui';

export default function Sent() {
  const { sent, outcomes } = useStore();
  return <Screen title="Sent" lead={<T variant="body" tone="muted">Every reply that went out today, with the sources it cited.</T>}>
    <Section label="Today">
      <Group>
        {sent.map((tk, i) => <TicketRow key={tk.id} ticket={tk} outcome={outcomes[tk.id]} divider={i > 0} from="sent" />)}
      </Group>
    </Section>
  </Screen>;
}

import { router } from 'expo-router';
import { View } from 'react-native';
import { LIMIT } from '../../data';
import { useStore } from '../../store';
import { TicketRow } from '../../ticket-row';
import { useTheme } from '../../theme';
import { Button, Group, Icon, Screen, Section, T } from '../../ui';

export default function Inbox() {
  const t = useTheme();
  const { waiting, sent, outcomes } = useStore();
  const auto = sent.filter(tk => outcomes[tk.id].by === 'deskhand').length;

  if (!waiting.length) return <Screen title="Inbox">
    <View style={{ alignItems: 'center', paddingTop: 72, paddingHorizontal: 12 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: t.color.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={30} color={t.color.ink} stroke={2} />
      </View>
      <T variant="headline" weight="strong" accessibilityRole="header" style={{ marginTop: 20, textAlign: 'center' }}>Nothing waits for you</T>
      <T variant="body" tone="muted" style={{ marginTop: 8, textAlign: 'center', maxWidth: 320 }}>
        Deskhand sends replies under your <T variant="body" tone="muted" mono>${LIMIT}</T> limit on its own. Bigger refunds and every chargeback land here.
      </T>
      <Button kind="secondary" label="See sent replies" onPress={() => router.navigate('/sent')} style={{ marginTop: 24 }} />
    </View>
  </Screen>;

  return <Screen title="Inbox" lead={<T variant="body" tone="muted">
    {waiting.length === 1 ? '1 reply waits' : `${waiting.length} replies wait`} for you. Deskhand sent {auto} under your <T variant="body" tone="muted" mono>${LIMIT}</T> limit.
  </T>}>
    <Section label="Waiting for you">
      <Group>
        {waiting.map((tk, i) => <TicketRow key={tk.id} ticket={tk} divider={i > 0} from="inbox" />)}
      </Group>
    </Section>
  </Screen>;
}

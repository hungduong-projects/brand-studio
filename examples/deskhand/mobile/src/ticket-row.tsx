import { router } from 'expo-router';
import { View } from 'react-native';
import { LIMIT } from './data';
import type { Ticket } from './data';
import type { Outcome } from './store';
import { Row, T, Tag } from './ui';

/** One ticket in a list. The whole row is the target; its label reads as one sentence. */
export function TicketRow({ ticket: tk, outcome, divider, from }: { ticket: Ticket; outcome?: Outcome; divider?: boolean; from: 'inbox' | 'sent' }) {
  const why = tk.person ? 'Chargeback, needs a person' : tk.refund > LIMIT ? `Refund $${tk.refund}, over your $${LIMIT} limit` : '';
  const status = outcome ? `${outcome.by === 'you' ? 'Approved by you' : 'Sent by Deskhand'} at ${outcome.at}` : '';
  const label = [`Ticket ${tk.id}`, tk.subject, `from ${tk.customer}`, outcome ? status : why].filter(Boolean).join(', ');
  return <Row divider={divider} chevron accessibilityLabel={label} accessibilityHint="Opens the ticket"
    onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: tk.id, from } })}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      <T variant="footnote" tone="muted" mono>#{tk.id}</T>
      <T variant="footnote" tone="muted" mono>{outcome ? outcome.at : tk.received}</T>
    </View>
    <T variant="body" weight="strong" style={{ marginTop: 2 }}>{tk.subject}</T>
    <T variant="callout" tone="muted">{tk.customer} · Order <T variant="callout" tone="muted" mono>#{tk.order}</T></T>
    {outcome
      ? <T variant="footnote" tone="muted" style={{ marginTop: 4 }}>{outcome.by === 'you' ? 'Approved by you' : 'Sent by Deskhand'}{tk.refund ? <> · refund <T variant="footnote" tone="muted" mono>${tk.refund}</T></> : null}</T>
      : <View style={{ marginTop: 8 }}>
          <Tag>{tk.person ? 'Chargeback · needs a person' : <>Refund <T variant="caption" mono weight="medium">${tk.refund}</T> · over limit</>}</Tag>
        </View>}
  </Row>;
}

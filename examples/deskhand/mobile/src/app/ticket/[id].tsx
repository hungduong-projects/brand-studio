import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIMIT, docs, initials, money, ticket as findTicket } from '../../data';
import type { Ticket } from '../../data';
import { useReducedMotion } from '../../motion';
import { useStore } from '../../store';
import { useTheme } from '../../theme';
import { Button, Group, Icon, Row, SourceNumber, T, WebBack } from '../../ui';

type Phase = 'review' | 'sending' | 'error' | 'done';

const openSource = (id: string, n: number) => router.push({ pathname: '/source', params: { ticket: id, n: String(n) } });

/** The drafted reply. Each cited claim wears the highlighter and opens its source. */
function Reply({ tk }: { tk: Ticket }) {
  const t = useTheme();
  return <T variant="body" style={{ lineHeight: Math.round(t.type.body * 1.6) }}>
    {tk.reply.map((part, k) => typeof part === 'string'
      ? <Fragment key={k}>{part} </Fragment>
      : <Fragment key={k}>
          <T variant="body" accessibilityRole="link" accessibilityLabel={`${part.text} Source ${part.cite}, ${docs[tk.sources[part.cite - 1].doc].title}`}
            onPress={() => openSource(tk.id, part.cite)} style={{ backgroundColor: t.color.accent, color: t.color.onAccent }}>
            {part.text}<T variant="caption" mono weight="medium" style={{ color: t.color.onAccent }}> {part.cite}</T>
          </T>{' '}
        </Fragment>)}
  </T>;
}

function Sources({ tk }: { tk: Ticket }) {
  return <Group>
    {tk.sources.map((s, i) => {
      const doc = docs[s.doc];
      const row = doc.rows[s.row];
      return <Row key={i} divider={i > 0} chevron accessibilityLabel={`Source ${i + 1}, ${doc.kind}, ${doc.title}: ${row.text}${row.value ? ' ' + row.value : ''}`} accessibilityHint="Opens the source"
        onPress={() => openSource(tk.id, i + 1)}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <SourceNumber n={i + 1} />
          <View style={{ flex: 1 }}>
            <T variant="callout" weight="strong" mono={doc.mono}>{doc.mono ? `Order ${doc.title}` : doc.title}</T>
            <T variant="footnote" tone="muted" style={{ marginTop: 2 }}>{row.text}{row.value ? <> <T variant="footnote" tone="muted" mono>{row.value}</T></> : null}</T>
          </View>
        </View>
      </Row>;
    })}
  </Group>;
}

/** After sending: what happened, what the customer gets, and where to go next. */
function Done({ tk, handled }: { tk: Ticket; handled: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { waiting } = useStore();
  const pop = useRef(new Animated.Value(0)).current;
  const next = waiting.find(w => w.id !== tk.id);
  const first = tk.customer.split(' ')[0];
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(handled ? 'Marked as handled.' : `Sent to ${first}. Refund started.`);
    if (reduced === null) return;
    if (reduced) pop.setValue(1);
    else Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, [reduced]);

  return <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: insets.bottom + 24, alignItems: 'center' }}>
    <Animated.View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.color.ink, alignItems: 'center', justifyContent: 'center', opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
      <Icon name="check" size={34} color={t.color.surface} stroke={2.4} />
    </Animated.View>
    <T variant="headline" weight="strong" accessibilityRole="header" style={{ marginTop: 24, textAlign: 'center' }}>{handled ? 'Marked as handled' : `Sent to ${first}`}</T>
    <T variant="body" tone="muted" style={{ marginTop: 8, textAlign: 'center', maxWidth: 340 }}>
      {handled
        ? 'Reply to the chargeback from your helpdesk. Deskhand will not draft for this ticket.'
        : <>Refund of <T variant="body" tone="muted" mono>{money(tk.refund)}</T> started for order <T variant="body" tone="muted" mono>#{tk.order}</T>. It reaches the card in 3 to 5 business days.</>}
    </T>
    {!handled ? <Group style={{ alignSelf: 'stretch', marginTop: 28, padding: 16 }}>
      <T variant="footnote" tone="muted" weight="medium">Reply cited</T>
      {tk.sources.map((s, i) => <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 }}>
        <SourceNumber n={i + 1} />
        <T variant="callout" mono={docs[s.doc].mono} style={{ flex: 1 }}>{docs[s.doc].mono ? `Order ${docs[s.doc].title}` : docs[s.doc].title}</T>
      </View>)}
    </Group> : null}
    <View style={{ flex: 1, minHeight: 24 }} />
    <View style={{ alignSelf: 'stretch', gap: 8 }}>
      {next
        ? <>
            <Button label={`Next ticket #${next.id}`} onPress={() => router.replace({ pathname: '/ticket/[id]', params: { id: next.id, from: 'inbox' } })} />
            <Button kind="plain" label="Back to inbox" onPress={() => router.back()} />
          </>
        : <Button label="Back to inbox" onPress={() => router.back()} />}
    </View>
  </ScrollView>;
}

export default function TicketScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { outcomes, send, markHandled } = useStore();
  const [phase, setPhase] = useState<Phase>('review');
  const [error, setError] = useState('');
  const tk = findTicket(id);
  const back = from === 'sent' ? 'Sent' : 'Inbox';
  const header = <Stack.Screen options={{ title: tk ? `#${tk.id}` : 'Ticket', headerBackTitle: back, headerLeft: Platform.OS === 'web' ? () => <WebBack label={back} /> : undefined }} />;

  if (!tk) return <View style={{ flex: 1, padding: 24, paddingTop: 48, alignItems: 'center' }}>
    {header}
    <Icon name="alert" size={32} color={t.color.muted} />
    <T variant="headline" weight="strong" accessibilityRole="header" style={{ marginTop: 16 }}>This ticket is not here</T>
    <T variant="body" tone="muted" style={{ marginTop: 8, textAlign: 'center' }}>It may have been answered from another device.</T>
    <Button kind="secondary" label="Back to inbox" onPress={() => router.navigate('/')} style={{ marginTop: 24 }} />
  </View>;

  const outcome = outcomes[tk.id];
  if (phase === 'done') return <>{header}<Done tk={tk} handled={!!outcome && outcome.kind === 'handled'} /></>;

  const approve = async () => {
    setPhase('sending');
    try { await send(tk.id); setPhase('done'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); setPhase('error'); AccessibilityInfo.announceForAccessibility('Not sent.'); }
  };

  return <View style={{ flex: 1, backgroundColor: t.color.surface }}>
    {header}
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32, paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.color.elevated, borderWidth: 1, borderColor: t.color.lineSoft, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <T variant="footnote" weight="strong">{initials(tk.customer)}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="body" weight="strong">{tk.customer}</T>
          <T variant="footnote" tone="muted">Order <T variant="footnote" tone="muted" mono>#{tk.order}</T> · <T variant="footnote" tone="muted" mono>{tk.received}</T></T>
        </View>
      </View>
      <T variant="headline" weight="strong" accessibilityRole="header" style={{ marginTop: 20 }}>{tk.subject}</T>
      <T variant="body" style={{ marginTop: 8 }}>{tk.message}</T>

      <View style={{ marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <T variant="footnote" tone="muted" weight="medium" accessibilityRole="header">{!tk.reply.length ? 'No draft' : outcome ? 'Reply' : 'Draft reply'}</T>
        {tk.reply.length ? <T variant="footnote" tone="muted">Tap a highlight for its source</T> : null}
      </View>
      <Group style={{ marginTop: 8, padding: 16 }}>
        {tk.reply.length
          ? <Reply tk={tk} />
          : <View style={{ flexDirection: 'row', gap: 12 }}>
              <Icon name="person" size={22} color={t.color.ink} />
              <T variant="body" style={{ flex: 1 }}>Chargebacks always go to a person. Deskhand read the order and did not draft a reply.</T>
            </View>}
      </Group>

      <T variant="footnote" tone="muted" weight="medium" accessibilityRole="header" style={{ marginTop: 28, marginBottom: 8 }}>Sources</T>
      <Sources tk={tk} />

      {outcome ? <T variant="footnote" tone="muted" style={{ marginTop: 20 }}>
        {outcome.kind === 'handled' ? 'Marked as handled' : outcome.by === 'you' ? 'Approved by you and sent' : 'Sent by Deskhand'} at <T variant="footnote" tone="muted" mono>{outcome.at}</T>.
      </T> : null}
    </ScrollView>

    {outcome ? null : <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.color.line, backgroundColor: t.color.elevated, paddingTop: 14, paddingHorizontal: 20, paddingBottom: insets.bottom + 14, gap: 12 }}>
      {phase === 'error' ? <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="alert" size={20} color={t.color.danger} />
        <T variant="callout" style={{ flex: 1, color: t.color.danger }}><T variant="callout" weight="strong" style={{ color: t.color.danger }}>Not sent. </T>{error} No refund started and {tk.customer.split(' ')[0]} got nothing.</T>
      </View> : null}
      {tk.person
        ? <>
            <T variant="callout" tone="muted">Reply from your helpdesk, then mark it here.</T>
            <Button kind="secondary" label="Mark as handled" onPress={() => { markHandled(tk.id); setPhase('done'); }} />
          </>
        : <>
            {phase !== 'error' ? <T variant="callout">Refund <T variant="callout" mono weight="medium">{money(tk.refund)}</T> is over your <T variant="callout" mono weight="medium">${LIMIT}</T> limit.</T> : null}
            <Button label={phase === 'sending' ? 'Sending' : phase === 'error' ? 'Try again' : 'Approve and send'} busy={phase === 'sending'}
              hint={`Sends the reply and refunds ${money(tk.refund)}`} onPress={approve} />
          </>}
    </View>}
  </View>;
}

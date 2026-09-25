import { router } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { LIMIT } from '../../data';
import { useReducedMotion } from '../../motion';
import { useStore } from '../../store';
import { os, useTheme } from '../../theme';
import { Group, Row, Screen, Section, T } from '../../ui';

/** A read-only row: label on the leading side, value on the trailing side, wrapping at large text sizes. */
function Info({ label, value, mono, divider }: { label: string; value: string; mono?: boolean; divider?: boolean }) {
  const t = useTheme();
  return <View accessible accessibilityLabel={`${label}, ${value}`} style={{ minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, borderTopWidth: divider ? 0.5 : 0, borderTopColor: t.color.lineSoft }}>
    <T variant="body">{label}</T>
    <T variant="body" tone="muted" mono={mono}>{value}</T>
  </View>;
}

export default function Settings() {
  const t = useTheme();
  const { fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const { failNext, setFailNext, reset } = useStore();
  const textPath = os === 'android' ? 'Settings > Display > Font size' : 'Settings > Accessibility > Display & Text Size';
  const motionPath = os === 'android' ? 'Settings > Accessibility > Remove animations' : 'Settings > Accessibility > Motion';

  return <Screen title="Settings">
    <Section label="Approval" note="Change the limit in the Deskhand web console. Replies over it wait here for you.">
      <Group>
        <Info label="Refund limit" value={`$${LIMIT}`} mono />
        <Info label="Chargebacks" value="Always a person" divider />
      </Group>
    </Section>

    <Section label="Display" note={`Deskhand follows your system text size (${textPath}) and motion setting (${motionPath}). With less motion, highlights appear at once and screens change without sliding.`}>
      <Group>
        <Info label="Text size" value={`${fontScale.toFixed(1)}×`} />
        <Info label="Reduce motion" value={reduced ? 'On' : 'Off'} divider />
        <Info label="Appearance" value={t.scheme === 'dark' ? 'Dark' : 'Light'} divider />
      </Group>
    </Section>

    <Section label="Demo" note="Deskhand is fictional. Tickets, orders and prices are made up. It is a Brand Studio example.">
      <Group>
        <Row role="switch" accessibilityLabel="Fail the next send" aria-checked={failNext} onPress={() => setFailNext(!failNext)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T variant="body">Fail the next send</T>
              <T variant="footnote" tone="muted">Shows what happens when a reply cannot go out.</T>
            </View>
            <View style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: failNext ? t.color.ink : t.color.pressed, borderWidth: 1, borderColor: failNext ? t.color.ink : t.color.line, alignItems: failNext ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: failNext ? t.color.surface : t.color.elevated, borderWidth: failNext ? 0 : 1, borderColor: t.color.line }} />
            </View>
          </View>
        </Row>
        <Row divider accessibilityLabel="Reset demo" accessibilityHint="Puts every ticket back in the inbox" onPress={() => { reset(); router.navigate('/'); }}>
          <T variant="body" weight="medium">Reset demo</T>
        </Row>
      </Group>
    </Section>
  </Screen>;
}

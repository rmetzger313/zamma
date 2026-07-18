// Feedback geben (Kern des Anti-Timewaster-Systems): 5 Sterne, Attribut-Chips,
// optionaler Kommentar. Senden disabled bis mindestens 1 Stern. Ohne Tab-Bar.
import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Avatar, BackButton, SectionLabel, PrimaryButton, Row, Card } from '../../src/ui';
import { colors, font } from '../../src/theme';
import { api } from '../../src/api';
import { useAppState } from '../../src/state';

// Design-Chips → Spez-Tags
const CHIPS = [
  { label: 'Pünktlich', tag: 'punctual', negative: false },
  { label: 'Freundlich', tag: 'friendly', negative: false },
  { label: 'Gut organisiert', tag: 'organized', negative: false },
  { label: 'Wie beschrieben', tag: 'as_described', negative: false },
  { label: 'Zu spät', tag: 'late', negative: true },
  { label: 'Kurzfristig abgesagt', tag: 'cancelled_short_notice', negative: true },
];

export default function FeedbackScreen() {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pendingFb, reloadPendingFb, setFbThanks, reloadMe } = useAppState();
  const item = pendingFb.find((p) => p.eventId === eventId) ?? pendingFb[0];
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toggleTag = (tag) => setTags((t) => ({ ...t, [tag]: !t[tag] }));

  const submit = async () => {
    if (!stars || busy || !item) return;
    setBusy(true);
    setError(null);
    try {
      await api.sendFeedback({
        eventId: item.eventId,
        stars,
        tags: Object.keys(tags).filter((t) => tags[t]),
        comment: note,
      });
      setFbThanks(true);
      reloadPendingFb();
      reloadMe();
      router.back(); // zurück zum Feed → grünes Bestätigungs-Banner
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Row gap={10} style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8 }}>
        <BackButton onPress={() => router.back()} />
        <T s={15} w={800}>Feedback geben</T>
      </Row>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 40 }}>
        {item ? (
          <Card radiusSize={16} pad={0} style={{ paddingVertical: 14, paddingHorizontal: 16, marginBottom: 20 }}>
            <Row gap={12}>
              <Avatar initials={item.groupInitials} color={item.groupColor} size={44} square textSize={16} />
              <View style={{ flexShrink: 1 }}>
                <T s={14.5} w={800}>{item.title}</T>
                <T s={12.5} w={700} c={colors.muted}>
                  {item.dateLabel} · {item.city} · Host: {item.hostName}
                </T>
              </View>
            </Row>
          </Card>
        ) : (
          <Card radiusSize={16} style={{ marginBottom: 20 }}>
            <T s={14} w={700} c={colors.muted}>Kein offenes Feedback — alles erledigt!</T>
          </Card>
        )}

        <SectionLabel style={{ marginBottom: 10 }}>WIE WAR DAS TREFFEN?</SectionLabel>
        <Row gap={6} style={{ justifyContent: 'center', marginBottom: 22 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setStars(n)}
              style={{ padding: 2, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel={`${n} Sterne`}
            >
              <T s={34} c={n <= stars ? colors.amberBright : colors.btnDisabledBg}>★</T>
            </Pressable>
          ))}
        </Row>

        <SectionLabel style={{ marginBottom: 10 }}>WAS TRIFFT ZU?</SectionLabel>
        <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 22 }}>
          {CHIPS.map((c) => {
            const active = !!tags[c.tag];
            const color = c.negative ? colors.primaryDark : colors.success;
            const bg = c.negative ? colors.primarySoft : colors.successSoft;
            return (
              <Pressable
                key={c.tag}
                onPress={() => toggleTag(c.tag)}
                style={{
                  borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
                  minHeight: 36, justifyContent: 'center',
                  borderColor: active ? color : colors.cardBorder,
                  backgroundColor: active ? bg : colors.white,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <T s={13} w={700} c={active ? color : colors.secondary}>{c.label}</T>
              </Pressable>
            );
          })}
        </Row>

        <SectionLabel>KOMMENTAR (OPTIONAL)</SectionLabel>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Kurz & ehrlich — hilft allen weiter"
          placeholderTextColor={colors.disabled}
          style={{
            width: '100%', minHeight: 80, borderWidth: 1.5, borderColor: colors.cardBorder,
            borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14,
            fontSize: 14.5, fontFamily: font[600], color: colors.ink,
            backgroundColor: colors.white, textAlignVertical: 'top',
          }}
        />
        <View style={{ backgroundColor: colors.divider, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 13, marginTop: 12, marginBottom: 16 }}>
          <T s={12} w={600} c={colors.muted} lh={17.4}>
            Feedback ist erst nach dem Treffen möglich und wird anonymisiert in den
            Zuverlässigkeits-Score einbezogen — so fallen No-Shows früh auf.
          </T>
        </View>
        {error ? (
          <T s={13} w={700} c={colors.primaryDark} style={{ marginBottom: 10 }}>{error}</T>
        ) : null}
        <PrimaryButton label="Feedback senden" disabled={!stars || !item} onPress={submit} />
      </ScrollView>
    </View>
  );
}

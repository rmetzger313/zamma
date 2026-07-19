// Profil: Karte mit Avatar/Stats, Verifizierungs-Banner, Hobbys, letztes Feedback.
import React, { useCallback } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Avatar, VerifiedBadge, Card, SectionLabel, Row } from '../../../src/ui';
import { colors } from '../../../src/theme';
import { useAppState } from '../../../src/state';

function StatTile({ value, label, highlight }) {
  return (
    <View
      style={{
        flex: 1, backgroundColor: highlight ? colors.successSoft : colors.bg,
        borderRadius: 12, padding: 10, alignItems: 'center',
      }}
    >
      <T s={18} w={800} c={highlight ? colors.success : colors.ink}>{value}</T>
      <T s={11} w={800} c={highlight ? colors.success : colors.muted}>{label}</T>
    </View>
  );
}

export default function Profil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me, reloadMe } = useAppState();

  useFocusEffect(useCallback(() => { reloadMe(); }, []));

  if (!me) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 96 }}
    >
      <T s={20} w={800} style={{ marginBottom: 14 }}>Profil</T>

      <Card radiusSize={18} pad={18} style={{ marginBottom: 12 }}>
        <Row gap={14}>
          <Avatar initials={me.initials} color={me.avatarColor} size={58} textSize={20} />
          <View>
            <Row gap={7}>
              <T s={18} w={800}>{me.name}</T>
              {me.verified ? <VerifiedBadge size={18} /> : null}
            </Row>
            <T s={13} w={700} c={colors.muted}>{me.city} · {me.sinceLabel}</T>
          </View>
        </Row>
        <Row gap={8} style={{ marginTop: 14 }}>
          <StatTile value={`${me.reliabilityScore} %`} label="ZUVERLÄSSIG" highlight />
          <StatTile value={String(me.meetingsAttended)} label="TREFFEN" />
          <StatTile value={me.avgRatingLabel ?? '–'} label="BEWERTUNG" />
        </Row>
      </Card>

      <Pressable
        onPress={() => router.push('/(tabs)/profil/verifizierung')}
        style={{
          backgroundColor: colors.successSoft, borderRadius: 16,
          paddingVertical: 13, paddingHorizontal: 15, marginBottom: 14,
          flexDirection: 'row', gap: 10, alignItems: 'center',
        }}
        accessibilityRole="button"
      >
        <View
          style={{
            width: 30, height: 30, borderRadius: 15, backgroundColor: colors.success,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <T s={14} w={800} c={colors.white}>✓</T>
        </View>
        <T s={13} w={600} c={colors.successDark} lh={18.2} style={{ flex: 1 }}>
          <T s={13} w={800} c={colors.successDark}>
            {me.verified ? 'Identität verifiziert. ' : 'Verifiziere dich. '}
          </T>
          Pünktlichkeit &amp; Feedback halten die Community verlässlich — wer oft absagt, wird früh erkennbar.
        </T>
        <T s={16} w={800} c={colors.success}>›</T>
      </Pressable>

      <SectionLabel>MEINE HOBBYS</SectionLabel>
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 18 }}>
        {me.hobbies.map((h) => (
          <View
            key={h.name}
            style={{ backgroundColor: colors.primarySoft, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 }}
          >
            <T s={13} w={700} c={colors.primaryDark}>{h.name}</T>
          </View>
        ))}
      </Row>

      <SectionLabel>LETZTES FEEDBACK</SectionLabel>
      <View style={{ gap: 9 }}>
        {me.recentFeedback.map((fb, i) => (
          <Card key={i} radiusSize={14} pad={0} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
            <Row gap={8} style={{ marginBottom: 4 }}>
              <Avatar initials={fb.fromInitials} color={fb.fromColor} size={24} textSize={10} />
              <T s={13} w={800}>{fb.fromName}</T>
              <View style={{ marginLeft: 'auto' }}>
                <T s={12} w={800} c={colors.amber}>{fb.starsLabel}</T>
              </View>
            </Row>
            {fb.text ? <T s={13.5} w={600} c={colors.secondary} lh={18.9}>{fb.text}</T> : null}
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

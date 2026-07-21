// Profil: Karte mit Avatar/Stats, Verifizierungs-Banner, Hobbys, letztes Feedback.
import React, { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Avatar, VerifiedBadge, Card, SectionLabel, Row, SkillDots, pressedFx, Skeleton } from '../../../src/ui';
import { useColors, useThemeControl } from '../../../src/theme-context';
import { api, useApi } from '../../../src/api';
import { useAppState } from '../../../src/state';

function StatTile({ value, label, highlight }) {
  const colors = useColors();
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
  const colors = useColors();
  const { mode, setMode } = useThemeControl();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me, reloadMe } = useAppState();
  const { data: suggestions, reload: reloadSuggestions } = useApi(api.suggestions, []);
  const { data: badges, reload: reloadBadges } = useApi(api.badges, []);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { reloadMe(); reloadSuggestions(); }, [reloadMe, reloadSuggestions]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([reloadMe(), reloadSuggestions(), reloadBadges()]).finally(() => setRefreshing(false));
  }, [reloadMe, reloadSuggestions, reloadBadges]);

  // 1-Tap-Hinzufügen eines vorgeschlagenen Hobbys (Level 1)
  const addHobby = async (name) => {
    if (!me) return;
    try {
      await api.saveHobbies([...me.hobbies.map((h) => ({ name: h.name, skillLevel: h.skillLevel })), { name, skillLevel: 1 }]);
      reloadMe();
      reloadSuggestions();
    } catch {}
  };

  if (!me) {
    // Skeleton statt leerem Screen beim Erst-Load
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <Skeleton w={90} h={20} style={{ marginBottom: 14 }} />
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 18, padding: 18, gap: 14 }}>
          <Row gap={14}>
            <Skeleton w={58} h={58} r={29} />
            <View style={{ gap: 8 }}>
              <Skeleton w={120} h={18} />
              <Skeleton w={170} h={13} />
            </View>
          </Row>
          <Row gap={8}>
            <Skeleton w="31%" h={58} r={12} />
            <Skeleton w="31%" h={58} r={12} />
            <Skeleton w="31%" h={58} r={12} />
          </Row>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 96 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
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
        style={({ pressed }) => [
          {
            backgroundColor: colors.successSoft, borderRadius: 16,
            paddingVertical: 13, paddingHorizontal: 15, marginBottom: 14,
            flexDirection: 'row', gap: 10, alignItems: 'center',
          },
          pressedFx(pressed),
        ]}
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
          <Row
            key={h.name}
            gap={6}
            style={{ backgroundColor: colors.primarySoft, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 }}
          >
            <T s={13} w={700} c={colors.primaryDark}>{h.name}</T>
            <SkillDots level={h.skillLevel} size={9} />
          </Row>
        ))}
      </Row>

      {suggestions?.length ? (
        <>
          <SectionLabel>KÖNNTE DIR GEFALLEN</SectionLabel>
          <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 18 }}>
            {suggestions.map((s) => (
              <Pressable
                key={s.hobby}
                onPress={() => addHobby(s.hobby)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    borderWidth: 1.5, borderColor: colors.cardBorder, borderStyle: 'dashed',
                    backgroundColor: colors.surface, borderRadius: 999,
                    paddingVertical: 7, paddingHorizontal: 13, minHeight: 36,
                  },
                  pressedFx(pressed),
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${s.hobby} hinzufügen — weil du ${s.because} magst`}
              >
                <T s={13} w={800} c={colors.primary}>+</T>
                <T s={13} w={700} c={colors.secondary}>{s.hobby}</T>
              </Pressable>
            ))}
          </Row>
        </>
      ) : null}

      {badges?.some((b) => b.earned) ? (
        <>
          <SectionLabel>ABZEICHEN</SectionLabel>
          <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 18 }}>
            {badges.filter((b) => b.earned).map((b) => (
              <Row
                key={b.key}
                gap={6}
                style={{ backgroundColor: colors.amberSoft, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 }}
                accessibilityLabel={`${b.label}: ${b.desc}`}
              >
                <T s={13}>{b.icon}</T>
                <T s={13} w={700} c={colors.amber}>{b.label}</T>
              </Row>
            ))}
          </Row>
        </>
      ) : null}

      <SectionLabel>DARSTELLUNG</SectionLabel>
      <Row gap={8} style={{ marginBottom: 18 }}>
        {[['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([m, lbl]) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={({ pressed }) => [
                {
                  flex: 1, borderWidth: 1.5, borderRadius: 12,
                  paddingVertical: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                  borderColor: active ? colors.primary : colors.cardBorder,
                  backgroundColor: active ? colors.primarySoft : colors.surface,
                },
                pressedFx(pressed),
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Darstellung: ${lbl}`}
            >
              <T s={13} w={700} c={active ? colors.primaryDark : colors.secondary}>{lbl}</T>
            </Pressable>
          );
        })}
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

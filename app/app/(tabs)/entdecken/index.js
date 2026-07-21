// Entdecken: Feed + Kartenansicht, Filter-Chips, Feedback-Prompt-Banner,
// Empty-State. Karten-Toggle erhält den Filterzustand.
import React, { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Chip, Row, Avatar, Card, SectionLabel, VerifiedBadge, pressedFx, EventCardSkeleton } from '../../../src/ui';
import { categories } from '../../../src/theme';
import { useColors } from '../../../src/theme-context';
import { api, useApi } from '../../../src/api';
import { useAppState } from '../../../src/state';
import { EventCard } from '../../../src/EventCard';
import { DemoMap } from '../../../src/DemoMap';

const FILTERS = [{ id: 'alle', label: 'Alle' }].concat(
  Object.entries(categories).map(([id, c]) => ({ id, label: c.label }))
);

export default function Entdecken() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('alle');
  const [view, setView] = useState('list');
  const { pendingFb, fbThanks, setFbThanks } = useAppState();
  const { data: events, reload } = useApi(() => api.events(filter), [filter]);
  const { data: people, reload: reloadPeople } = useApi(api.matches, []);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { reload(); reloadPeople(); }, [reload, reloadPeople]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([reload(), reloadPeople()]).finally(() => setRefreshing(false));
  }, [reload, reloadPeople]);
  // Erfolgs-Banner verschwindet erst beim echten Verlassen des Feeds (wie im
  // Prototyp) — separater Effekt mit leeren Deps, damit der Cleanup NICHT bei
  // jedem Filterwechsel (neue reload-Identität) feuert.
  useFocusEffect(
    useCallback(() => () => setFbThanks(false), [setFbThanks])
  );

  const openEvent = (e) => router.push(`/(tabs)/entdecken/event/${e.id}`);
  const prompt = pendingFb?.[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <Row style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 10 }} gap={10}>
        <View>
          <T s={12} w={700} c={colors.muted}>DEIN UMKREIS</T>
          <T s={20} w={800}>München · 25 km</T>
        </View>
        <Pressable
          onPress={() => setView((v) => (v === 'list' ? 'map' : 'list'))}
          style={({ pressed }) => [
            {
              marginLeft: 'auto', borderWidth: 1.5, borderColor: colors.cardBorder,
              backgroundColor: colors.surface, borderRadius: 999,
              paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center',
            },
            pressedFx(pressed),
          ]}
          accessibilityRole="button"
        >
          <T s={13} w={700}>{view === 'list' ? '⊞ Karte' : '☰ Liste'}</T>
        </Pressable>
      </Row>

      {/* Filter-Chips */}
      <View style={{ flexGrow: 0, flexShrink: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 }}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.id}
              label={f.label}
              size={13}
              pad={{ paddingVertical: 7, paddingHorizontal: 14 }}
              active={filter === f.id}
              color={colors.inverse}
              bg={colors.inverse}
              activeStyle={{ backgroundColor: colors.inverse, borderColor: colors.inverse }}
              onPress={() => setFilter(f.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Feedback-Prompt-Banner */}
      {prompt ? (
        <Pressable
          onPress={() => router.push(`/feedback/${prompt.eventId}`)}
          style={({ pressed }) => [
            {
              marginHorizontal: 20, marginBottom: 10, backgroundColor: colors.inverse,
              borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            },
            pressedFx(pressed),
          ]}
          accessibilityRole="button"
        >
          <View
            style={{
              width: 34, height: 34, borderRadius: 17, backgroundColor: colors.amberBright,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <T s={16} w={800} c="#1C1917">★</T>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T s={14} w={800} c={colors.inverseInk}>{prompt.promptLabel}</T>
            <T s={12} w={600} c={colors.deco}>Dein Feedback hält die Community verlässlich</T>
          </View>
          <T s={16} w={800} c={colors.inverseInk}>→</T>
        </Pressable>
      ) : null}

      {/* Erfolgs-Banner nach Feedback */}
      {fbThanks ? (
        <Row
          gap={10}
          style={{
            marginHorizontal: 20, marginBottom: 10, backgroundColor: colors.successSoft,
            borderRadius: 14, paddingVertical: 11, paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <T s={12} w={800} c={colors.white}>✓</T>
          </View>
          <T s={13} w={700} c={colors.successDark}>Danke! Dein Feedback wurde gespeichert.</T>
        </Row>
      ) : null}

      {view === 'list' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 20, paddingBottom: 96, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {/* Skeleton statt leerem Screen beim Erst-Load */}
          {events == null ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : null}
          {/* Leute-Matching: Kompatibilität über gemeinsame Hobbys */}
          {filter === 'alle' && people?.length ? (
            <View>
              <SectionLabel>LEUTE IN DEINER NÄHE</SectionLabel>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {people.map((p) => (
                  <Card key={p.id} radiusSize={16} pad={12} style={{ width: 150 }}>
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Avatar initials={p.initials} color={p.avatarColor} size={40} textSize={14} />
                      <Row gap={5}>
                        <T s={13.5} w={800} numberOfLines={1}>{p.name}</T>
                        {p.verified ? <VerifiedBadge size={14} /> : null}
                      </Row>
                      <T s={11.5} w={700} c={colors.success} center numberOfLines={1}>
                        {p.sharedHobbies.slice(0, 2).join(' · ') || 'Ähnliche Hobbys'}
                      </T>
                      <T s={11} w={600} c={colors.muted} center numberOfLines={1}>{p.repLabel}</T>
                    </View>
                  </Card>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {(events ?? []).map((e) => (
            <EventCard key={e.id} event={e} onPress={() => openEvent(e)} />
          ))}
          {events && events.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.surface, borderWidth: 1.5, borderStyle: 'dashed',
                borderColor: colors.dashedBorder, borderRadius: 18,
                paddingVertical: 30, paddingHorizontal: 22, alignItems: 'center', marginTop: 8,
              }}
            >
              <View
                style={{
                  width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}
              >
                <T s={20} w={800} c={colors.primary}>+</T>
              </View>
              <T s={15.5} w={800} style={{ marginBottom: 4 }}>Hier ist noch nichts los</T>
              <T s={13} w={600} c={colors.muted} lh={19.5} center style={{ marginBottom: 16 }}>
                Sei die erste Person, die in dieser Kategorie etwas startet — genau so entsteht deine Community.
              </T>
              <Pressable
                onPress={() => router.push('/(tabs)/erstellen')}
                style={{
                  backgroundColor: colors.primary, borderRadius: 12,
                  paddingVertical: 11, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center',
                }}
                accessibilityRole="button"
              >
                <T s={14} w={800} c={colors.white}>Verabredung erstellen</T>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <DemoMap events={events ?? []} onOpen={openEvent} />
      )}
    </View>
  );
}

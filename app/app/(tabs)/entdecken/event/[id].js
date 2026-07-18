// Detail: Info-Card, Beschreibung, Host-Card, Teilnehmer-Pills, Sticky-CTA
// „Mitmachen" → „✓ Du bist dabei" + Absagen, Absage-Modal mit Score-Vorschau.
import React, { useCallback, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, Badge, Card, Avatar, SkillDots, VerifiedBadge, BackButton, PrimaryButton, Row } from '../../../../src/ui';
import { colors, categories } from '../../../../src/theme';
import { api, useApi } from '../../../../src/api';
import { useAppState } from '../../../../src/state';

const TAB_BAR_HEIGHT = 82;

function InfoRow({ label, children, last }) {
  return (
    <Row
      gap={10}
      style={{
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <T s={14} w={700} c={colors.muted} style={{ width: 78 }}>{label}</T>
      {children}
    </Row>
  );
}

export default function EventDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reloadMe } = useAppState();
  const { data: event, reload, setData } = useApi(() => api.event(id), [id]);
  const [modal, setModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (!event) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const cat = categories[event.category];
  const joined = event.joined;

  // Beitreten — optimistic: sofort mutieren, bei Fehler zurückrollen
  const onJoin = async () => {
    if (busy || joined || event.isHost) return;
    setBusy(true);
    const prev = event;
    setData({
      ...event,
      joined: true,
      joinedCount: event.joinedCount + 1,
      spotsLabel: `${event.joinedCount + 1} / ${event.maxSpots} dabei`,
      participants: [{ id: 'me', name: 'Du', initials: 'DU', avatarColor: '#7a5fd5', isMe: true }, ...event.participants],
    });
    try {
      const fresh = await api.join(event.id);
      setData(fresh);
    } catch {
      setData(prev);
    } finally {
      setBusy(false);
    }
  };

  const openCancelModal = async () => {
    setModal(true);
    setPreview(null);
    try { setPreview(await api.cancelPreview(event.id)); } catch {}
  };

  const confirmCancel = async () => {
    setModal(false);
    const prev = event;
    setData({
      ...event,
      joined: false,
      joinedCount: event.joinedCount - 1,
      spotsLabel: `${event.joinedCount - 1} / ${event.maxSpots} dabei`,
      participants: event.participants.filter((p) => !p.isMe),
    });
    try {
      await api.cancel(event.id);
      reloadMe(); // Score kann sich geändert haben
      reload();
    } catch {
      setData(prev);
    }
  };

  // „Du" immer vorn
  const participants = [...event.participants].sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Row gap={10} style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8 }}>
        <BackButton onPress={() => router.back()} />
        <T s={15} w={800}>Verabredung</T>
      </Row>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 190 }}
      >
        <Row gap={8} style={{ marginBottom: 10 }}>
          <Badge label={cat.label} color={cat.color} bg={cat.bg} size={12} pad={{ paddingVertical: 5, paddingHorizontal: 11 }} />
          {event.recurringLabel ? (
            <Badge label={`↻ ${event.recurringLabel}`} color={colors.muted} bg={colors.divider} size={12} w={700} pad={{ paddingVertical: 5, paddingHorizontal: 11 }} />
          ) : null}
        </Row>
        <T s={24} w={800} lh={28.8} ls={-0.24} style={{ marginBottom: 14 }}>{event.title}</T>

        <Card radiusSize={16} pad={0} style={{ paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14 }}>
          <InfoRow label="Wann"><T s={14} w={800}>{event.dateLabel} · {event.timeLabel}</T></InfoRow>
          <InfoRow label="Wo">
            <T s={14} w={800}>{event.city}{event.distLabel ? ` · ${event.distLabel}` : ''}</T>
          </InfoRow>
          <InfoRow label="Level">
            <SkillDots level={event.skillLevel} size={14} />
            <T s={14} w={700}>{event.skillLabel}</T>
            {event.match ? (
              <Badge label="✦ Passt zu dir" color={colors.success} bg={colors.successSoft} size={11} pad={{ paddingVertical: 3, paddingHorizontal: 9 }} />
            ) : null}
          </InfoRow>
          <InfoRow label="Plätze" last><T s={14} w={800} c={colors.success}>{event.spotsLabel}</T></InfoRow>
        </Card>

        {event.description ? (
          <T s={14.5} w={600} c={colors.secondary} lh={22.5} style={{ marginBottom: 16 }}>{event.description}</T>
        ) : null}

        {/* Host-Card */}
        <Card radiusSize={16} pad={0} style={{ paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14 }}>
          <Row gap={10}>
            <Avatar initials={event.host.initials} color={event.host.avatarColor} size={42} textSize={15} />
            <View>
              <Row gap={6}>
                <T s={14.5} w={800}>{event.host.name}</T>
                {event.host.verified ? <VerifiedBadge size={16} /> : null}
              </Row>
              <T s={12.5} w={600} c={colors.muted}>{event.host.repLabel}</T>
            </View>
            <Pressable
              style={{
                marginLeft: 'auto', borderWidth: 1.5, borderColor: colors.cardBorder,
                backgroundColor: colors.bg, borderRadius: 999,
                paddingVertical: 7, paddingHorizontal: 13, minHeight: 36, justifyContent: 'center',
              }}
              accessibilityRole="button"
            >
              <T s={12.5} w={800}>Profil</T>
            </Pressable>
          </Row>
        </Card>

        <T s={13} w={800} c={colors.muted} style={{ marginBottom: 8 }}>DABEI ({event.joinedCount - 1})</T>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {participants.map((p) => (
            <Row
              key={p.id}
              gap={7}
              style={{
                backgroundColor: colors.white, borderWidth: 1, borderColor: colors.cardBorder,
                borderRadius: 999, paddingVertical: 5, paddingRight: 12, paddingLeft: 5,
              }}
            >
              <Avatar initials={p.initials} color={p.avatarColor} size={26} textSize={10.5} />
              <T s={13} w={700}>{p.name}</T>
            </Row>
          ))}
        </Row>
      </ScrollView>

      {/* Sticky-CTA über der Tab-Bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: TAB_BAR_HEIGHT }}>
        <LinearGradient colors={['rgba(250,246,240,0)', colors.bg]} locations={[0, 0.4]} style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 14 }}>
          {event.isHost ? (
            <PrimaryButton label="Du bist Host dieses Treffens" disabled />
          ) : joined ? (
            <>
              <PrimaryButton label="✓ Du bist dabei" bg={colors.successSoft} fg={colors.success} onPress={openCancelModal} />
              <Pressable onPress={openCancelModal} style={{ paddingTop: 10, minHeight: 44, alignItems: 'center' }} accessibilityRole="button">
                <T s={13.5} w={800} c={colors.primaryDark}>Absagen</T>
              </Pressable>
            </>
          ) : (
            <PrimaryButton label="Mitmachen" onPress={onJoin} />
          )}
        </LinearGradient>
      </View>

      {/* Absage-Modal */}
      {modal ? (
        <View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay,
            alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 10,
          }}
        >
          <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 22, width: '100%', maxWidth: 320 }}>
            <T s={17} w={800} style={{ marginBottom: 8 }}>Wirklich absagen?</T>
            <T s={13.5} w={600} c={colors.secondary} lh={20.25} style={{ marginBottom: 10 }}>
              Absagen weniger als 24 h vor dem Treffen senken deinen Zuverlässigkeits-Score. Die Gruppe wird automatisch benachrichtigt.
            </T>
            {preview?.late ? (
              <View style={{ backgroundColor: colors.amberSoft, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 16 }}>
                <T s={12.5} w={800} c={colors.amberDarkText}>
                  Dein Score: {preview.current} % → {preview.after} %
                </T>
              </View>
            ) : preview ? (
              <View style={{ backgroundColor: colors.divider, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 16 }}>
                <T s={12.5} w={700} c={colors.muted}>
                  Mehr als 24 h vorher — dein Score bleibt bei {preview.current} %.
                </T>
              </View>
            ) : (
              <View style={{ height: 16 }} />
            )}
            <Row gap={8}>
              <Pressable
                onPress={() => setModal(false)}
                style={{
                  flex: 1, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.cardBorder,
                  borderRadius: 12, padding: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                }}
                accessibilityRole="button"
              >
                <T s={14} w={800}>Doch dabei</T>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                style={{
                  flex: 1, backgroundColor: colors.primaryDark, borderRadius: 12, padding: 12,
                  minHeight: 44, alignItems: 'center', justifyContent: 'center',
                }}
                accessibilityRole="button"
              >
                <T s={14} w={800} c={colors.white}>Absagen</T>
              </Pressable>
            </Row>
          </View>
        </View>
      ) : null}
    </View>
  );
}

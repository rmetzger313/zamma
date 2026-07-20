// Detail: Info-Card, Beschreibung, Host-Card, Teilnehmer-Pills, Sticky-CTA
// „Mitmachen" → „✓ Du bist dabei" + Absagen, Absage-Modal mit Score-Vorschau.
import React, { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, Badge, Card, Avatar, SkillDots, VerifiedBadge, BackButton, PrimaryButton, Row } from '../../../../src/ui';
import { colors, categories, tabBarHeight } from '../../../../src/theme';
import { api, useApi } from '../../../../src/api';
import { useAppState } from '../../../../src/state';

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
  const { data: event, error, reload, setData } = useApi(() => api.event(id), [id]);
  const [modal, setModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [hostMenu, setHostMenu] = useState(null); // null | 'menu' | 'report' | 'reported'

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Row gap={10} style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8 }}>
          <BackButton onPress={() => router.back()} />
          <T s={15} w={800}>Verabredung</T>
        </Row>
        {error ? (
          <View style={{ padding: 20, gap: 12 }}>
            <T s={14} w={700} c={colors.secondary}>
              Das Treffen konnte nicht geladen werden{error.message ? ` (${error.message})` : ''}.
            </T>
            <PrimaryButton label="Erneut versuchen" onPress={reload} />
          </View>
        ) : null}
      </View>
    );
  }

  const cat = categories[event.category];
  const joined = event.joined;
  const full = !joined && !event.isHost &&
    (event.status === 'full' || event.joinedCount >= event.maxSpots);

  // Beitreten — optimistic: sofort mutieren, bei Fehler zurückrollen + Meldung
  const onJoin = async () => {
    if (busy || joined || event.isHost || full) return;
    setBusy(true);
    setActionError(null);
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
    } catch (e) {
      setData(prev);
      setActionError(e.message || 'Beitreten fehlgeschlagen');
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
    setActionError(null);
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
    } catch (e) {
      setData(prev);
      setActionError(e.message || 'Absagen fehlgeschlagen');
    }
  };

  // „Du" immer vorn
  const participants = [...event.participants].sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0));
  const bottomOffset = tabBarHeight(insets);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Row gap={10} style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8 }}>
        <BackButton onPress={() => router.back()} />
        <T s={15} w={800}>Verabredung</T>
      </Row>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: bottomOffset + 110 }}
      >
        <Row gap={8} style={{ marginBottom: 10 }}>
          <Badge label={cat.label} color={cat.color} bg={cat.bg} size={12} pad={{ paddingVertical: 5, paddingHorizontal: 11 }} />
          {event.recurringLabel ? (
            <Badge label={`↻ ${event.recurringLabel}`} color={colors.muted} bg={colors.divider} size={12} w={700} pad={{ paddingVertical: 5, paddingHorizontal: 11 }} />
          ) : null}
        </Row>
        <T s={24} w={800} lh={28.8} ls={-0.24} style={{ marginBottom: 14 }}>{event.title}</T>

        <Card radiusSize={16} pad={0} style={{ paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14 }}>
          <InfoRow label="Wann"><T s={14} w={700}>{event.dateLabel} · {event.timeLabel}</T></InfoRow>
          <InfoRow label="Wo">
            <T s={14} w={700}>{event.city}{event.distLabel ? ` · ${event.distLabel}` : ''}</T>
          </InfoRow>
          <InfoRow label="Level">
            <SkillDots level={event.skillLevel} size={14} />
            <T s={14} w={700}>{event.skillLabel}</T>
            {event.match ? (
              <Badge label="✦ Passt zu dir" color={colors.success} bg={colors.successSoft} size={11} pad={{ paddingVertical: 3, paddingHorizontal: 9 }} />
            ) : null}
          </InfoRow>
          <InfoRow label="Plätze" last><T s={14} w={700} c={colors.success}>{event.spotsLabel}</T></InfoRow>
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
            {!event.isHost ? (
              <Pressable
                onPress={() => setHostMenu('menu')}
                style={{ minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="Mehr Optionen"
              >
                <T s={18} w={800} c={colors.muted}>⋯</T>
              </Pressable>
            ) : null}
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
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: bottomOffset }}>
        <LinearGradient colors={['rgba(250,246,240,0)', colors.bg]} locations={[0, 0.4]} style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 14 }}>
          {actionError ? (
            <T s={13} w={700} c={colors.primaryDark} center style={{ marginBottom: 8 }}>{actionError}</T>
          ) : null}
          {event.isHost ? (
            <PrimaryButton label="Du bist Host dieses Treffens" disabled />
          ) : joined ? (
            <>
              <PrimaryButton label="✓ Du bist dabei" bg={colors.successSoft} fg={colors.success} onPress={openCancelModal} />
              <Pressable onPress={openCancelModal} style={{ paddingTop: 10, minHeight: 44, alignItems: 'center' }} accessibilityRole="button">
                <T s={13.5} w={800} c={colors.primaryDark}>Absagen</T>
              </Pressable>
            </>
          ) : full ? (
            <PrimaryButton label="Ausgebucht" disabled />
          ) : (
            <PrimaryButton label="Mitmachen" onPress={onJoin} />
          )}
        </LinearGradient>
      </View>

      {/* Host-Menü: Melden & Blockieren (Trust & Safety) */}
      <Modal visible={!!hostMenu} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setHostMenu(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }} onPress={() => setHostMenu(null)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, paddingBottom: 34 }}>
            {hostMenu === 'menu' ? (
              <>
                <T s={15} w={800} style={{ marginBottom: 14 }}>{event.host.name}</T>
                <Pressable onPress={() => setHostMenu('report')} style={{ paddingVertical: 12, minHeight: 44 }} accessibilityRole="button">
                  <T s={14.5} w={700}>Nutzer melden</T>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    try {
                      await api.block(event.host.id);
                      setHostMenu(null);
                      router.back(); // Events des Geblockten verschwinden aus dem Feed
                    } catch (e) { setActionError(e.message); setHostMenu(null); }
                  }}
                  style={{ paddingVertical: 12, minHeight: 44 }}
                  accessibilityRole="button"
                >
                  <T s={14.5} w={700} c={colors.primaryDark}>Blockieren</T>
                </Pressable>
              </>
            ) : hostMenu === 'report' ? (
              <>
                <T s={15} w={800} style={{ marginBottom: 4 }}>Was ist das Problem?</T>
                <T s={12.5} w={600} c={colors.muted} style={{ marginBottom: 14 }}>Deine Meldung geht anonym an die Moderation.</T>
                {[['Spam', 'spam'], ['Belästigung', 'harassment'], ['Fake-Profil', 'fake']].map(([label, reason]) => (
                  <Pressable
                    key={reason}
                    onPress={async () => {
                      try {
                        await api.report({ targetType: 'user', targetId: event.host.id, reason });
                        setHostMenu('reported');
                      } catch (e) { setActionError(e.message); setHostMenu(null); }
                    }}
                    style={{ paddingVertical: 12, minHeight: 44 }}
                    accessibilityRole="button"
                  >
                    <T s={14.5} w={700}>{label}</T>
                  </Pressable>
                ))}
              </>
            ) : (
              <Row gap={10}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}>
                  <T s={12} w={800} c={colors.white}>✓</T>
                </View>
                <T s={14} w={700} c={colors.successDark}>Danke — die Moderation schaut sich das an.</T>
              </Row>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Absage-Modal — RN-Modal deckt auch die Tab-Bar ab, Android-Back schließt */}
      <Modal visible={modal} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setModal(false)}>
        <View
          style={{
            flex: 1, backgroundColor: colors.overlay,
            alignItems: 'center', justifyContent: 'center', padding: 24,
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
      </Modal>
    </View>
  );
}

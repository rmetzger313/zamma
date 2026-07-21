// Chat-Thread: fremde Bubbles weiß mit Absendername + Mini-Avatar, eigene
// Bubbles Terracotta rechtsbündig. Enter sendet. Ohne Tab-Bar (Root-Stack).
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Avatar, BackButton, Row, Input, pressedFx } from '../../src/ui';
import { colors, font } from '../../src/theme';
import { api, useApi } from '../../src/api';
import { useAppState } from '../../src/state';

export default function ChatThread() {
  const { seriesId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wsEvent } = useAppState();
  const { data: thread, setData, reload } = useApi(() => api.thread(seriesId), [seriesId]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => { api.markRead(seriesId).catch(() => {}); }, [seriesId]);

  // Live eingehende Nachrichten dieser Gruppe anhängen; nach einem
  // WS-Reconnect den Thread nachladen (Downtime-Nachrichten fehlen sonst).
  useEffect(() => {
    if (wsEvent?.type === 'chat:message' && wsEvent.seriesId === seriesId) {
      // Funktionales Update: kein stale-closure-Verlust bei schnellen Folge-Nachrichten
      setData((prev) => (prev ? { ...prev, messages: [...prev.messages, wsEvent.message] } : prev));
      api.markRead(seriesId).catch(() => {});
    }
    if (wsEvent?.type === 'ws:open') reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsEvent]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, [thread?.messages?.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !thread) return;
    setDraft('');
    const optimistic = {
      id: `tmp_${Date.now()}`, who: 'ich', initials: 'DU', color: '#8B5CF6',
      text, mine: true, createdAt: new Date().toISOString(),
    };
    setData({ ...thread, messages: [...thread.messages, optimistic] });
    try {
      const saved = await api.sendMessage(seriesId, text);
      setData((prev) => ({
        ...prev,
        messages: prev.messages.map((m) => (m.id === optimistic.id ? saved : m)),
      }));
    } catch {
      setData((prev) => ({ ...prev, messages: prev.messages.filter((m) => m.id !== optimistic.id) }));
      setDraft(text);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <Row
        gap={10}
        style={{
          paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 10,
          borderBottomWidth: 1, borderBottomColor: colors.cardBorder, backgroundColor: colors.white,
        }}
      >
        <BackButton onPress={() => router.back()} />
        <View>
          <T s={15} w={800}>{thread?.name ?? ''}</T>
          <T s={12} w={700} c={colors.muted}>{thread?.sub ?? ''}</T>
        </View>
      </Row>
      {/* Icebreaker: Hobby-Kontext direkt im Chat */}
      {thread?.sharedHobbies?.length ? (
        <Row
          gap={8}
          style={{
            marginTop: 10, marginHorizontal: 20, backgroundColor: colors.successSoft,
            borderRadius: 12, paddingVertical: 9, paddingHorizontal: 13, alignSelf: 'center',
          }}
        >
          <T s={12.5} w={800} c={colors.successDark}>Ihr teilt:</T>
          <T s={12.5} w={700} c={colors.successDark}>{thread.sharedHobbies.join(' · ')}</T>
        </Row>
      ) : null}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20, gap: 10 }}
      >
        {(thread?.messages ?? []).map((m) =>
          m.mine ? (
            <View
              key={m.id}
              style={{
                alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: colors.primary,
                borderTopLeftRadius: 16, borderTopRightRadius: 16,
                borderBottomLeftRadius: 16, borderBottomRightRadius: 4,
                paddingVertical: 9, paddingHorizontal: 13,
              }}
            >
              <T s={14} w={600} c={colors.white} lh={19.6}>{m.text}</T>
            </View>
          ) : (
            <Row key={m.id} gap={8} style={{ maxWidth: '82%', alignItems: 'flex-end' }}>
              <Avatar initials={m.initials} color={m.color} size={26} textSize={10} />
              <View
                style={{
                  backgroundColor: colors.white, borderWidth: 1, borderColor: colors.cardBorder,
                  borderTopLeftRadius: 16, borderTopRightRadius: 16,
                  borderBottomRightRadius: 16, borderBottomLeftRadius: 4,
                  paddingVertical: 9, paddingHorizontal: 13, flexShrink: 1,
                }}
              >
                <T s={11.5} w={800} c={colors.primary} style={{ marginBottom: 2 }}>{m.who}</T>
                <T s={14} w={600} lh={19.6}>{m.text}</T>
              </View>
            </Row>
          )
        )}
      </ScrollView>
      <Row gap={8} style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 30) }}>
        <Input
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          blurOnSubmit={false}
          placeholder="Nachricht…"
          accessibilityLabel="Nachricht"
          style={{
            flex: 1, borderWidth: 1.5, borderColor: colors.cardBorder, borderRadius: 999,
            paddingVertical: 12, paddingHorizontal: 16, fontSize: 14.5,
            fontFamily: font[600], color: colors.ink, backgroundColor: colors.white,
          }}
        />
        <Pressable
          onPress={send}
          style={({ pressed }) => [
            {
              width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary,
              alignItems: 'center', justifyContent: 'center',
            },
            pressedFx(pressed),
          ]}
          accessibilityRole="button"
          accessibilityLabel="Senden"
        >
          <T s={17} w={800} c={colors.white}>↑</T>
        </Pressable>
      </Row>
    </KeyboardAvoidingView>
  );
}

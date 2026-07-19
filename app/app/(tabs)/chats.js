// Chat-Liste: Gruppen-Kachel, Name, letzte Nachricht („Du: …"), Zeit, Unread-Badge.
import React, { useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Avatar, Row } from '../../src/ui';
import { colors } from '../../src/theme';
import { api, useApi } from '../../src/api';
import { useAppState } from '../../src/state';

export default function Chats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wsEvent } = useAppState();
  const { data: chats, reload } = useApi(api.chats, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  useEffect(() => {
    if (wsEvent?.type === 'chat:message' || wsEvent?.type === 'ws:open') reload();
  }, [wsEvent, reload]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 10 }}>
        <T s={20} w={800}>Chats</T>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 96, gap: 10 }}
      >
        {(chats ?? []).map((c) => (
          <Pressable
            key={c.seriesId}
            onPress={() => router.push(`/chat/${c.seriesId}`)}
            style={{
              flexDirection: 'row', gap: 12, alignItems: 'center',
              backgroundColor: colors.white, borderWidth: 1, borderColor: colors.cardBorder,
              borderRadius: 16, paddingVertical: 13, paddingHorizontal: 14,
            }}
            accessibilityRole="button"
          >
            <Avatar initials={c.initials} color={c.color} size={44} square textSize={16} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Row gap={8}>
                <T s={14.5} w={800} numberOfLines={1} style={{ flexShrink: 1 }}>{c.name}</T>
                <View style={{ marginLeft: 'auto' }}>
                  <T s={11.5} w={700} c={colors.muted}>{c.whenLabel}</T>
                </View>
              </Row>
              <T s={13} w={600} c={colors.muted} numberOfLines={1}>{c.lastMsg}</T>
            </View>
            {c.unread ? (
              <View
                style={{
                  width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <T s={11} w={800} c={colors.white}>{c.unread}</T>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

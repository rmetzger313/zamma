// Onboarding: Logo, Headline, Hobby-Multi-Select, Standort-Karte, CTA mit Zähler.
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, PrimaryButton, Row, SkillDots } from '../src/ui';
import { colors, HOBBIES } from '../src/theme';
import { api } from '../src/api';
import { useAppState } from '../src/state';

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setOnboarded, reloadMe } = useAppState();
  // Wert = Skill-Level (1–3); Tippen zykelt: aus → 1 → 2 → 3 → aus
  const [selected, setSelected] = useState({ Laufen: 1, Brettspiele: 1, Fotografie: 1 });
  const count = Object.keys(selected).length;

  const cycle = (name) =>
    setSelected((s) => {
      const next = ((s[name] ?? 0) + 1) % 4;
      const copy = { ...s };
      if (next === 0) delete copy[name];
      else copy[name] = next;
      return copy;
    });

  const finish = async () => {
    const hobbies = Object.entries(selected).map(([name, skillLevel]) => ({ name, skillLevel }));
    if (hobbies.length) {
      try { await api.saveHobbies(hobbies); reloadMe(); } catch {}
    }
    setOnboarded(true);
    router.replace('/(tabs)/entdecken');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 28, paddingHorizontal: 24, paddingBottom: 24,
        }}
      >
        <View
          style={{
            width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <T s={24} w={800} c={colors.white}>Z</T>
        </View>
        <T s={30} w={800} lh={34.5} ls={-0.6} style={{ marginTop: 20, marginBottom: 8 }}>
          Zamma.{'\n'}Gemeinsam statt allein.
        </T>
        <T s={15} w={600} c={colors.muted} lh={21.75} style={{ marginBottom: 22 }}>
          Finde Leute in deiner Nähe, die dein Hobby teilen. Was machst du gern?
        </T>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {HOBBIES.map((name) => {
            const lvl = selected[name] ?? 0;
            const active = lvl > 0;
            return (
              <Pressable
                key={name}
                onPress={() => cycle(name)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  borderWidth: 1.5, borderRadius: 999,
                  paddingVertical: 9, paddingHorizontal: 15, minHeight: 36,
                  borderColor: active ? colors.primaryDark : colors.cardBorder,
                  backgroundColor: active ? colors.primarySoft : colors.white,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={active ? `${name}, Level ${lvl} von 3` : name}
              >
                <T s={14} w={700} c={active ? colors.primaryDark : colors.secondary}>{name}</T>
                {active ? <SkillDots level={lvl} size={10} /> : null}
              </Pressable>
            );
          })}
        </Row>
        <T s={12} w={600} c={colors.muted} style={{ marginTop: 10 }}>
          Nochmal tippen wechselt dein Level: ●○○ Anfänger · ●●○ Fortgeschritten · ●●● Profi
        </T>
        <View style={{ marginTop: 'auto', paddingTop: 24 }}>
          <Row
            gap={10}
            style={{
              backgroundColor: colors.white, borderWidth: 1, borderColor: colors.cardBorder,
              borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
            <T s={14} w={700}>München &amp; Umgebung</T>
            <Pressable style={{ marginLeft: 'auto' }} accessibilityRole="button">
              <T s={13} w={600} c={colors.muted}>ändern</T>
            </Pressable>
          </Row>
          <PrimaryButton
            label={count ? `Los geht's (${count} ${count === 1 ? 'Hobby' : 'Hobbys'})` : "Los geht's"}
            onPress={finish}
          />
        </View>
      </ScrollView>
    </View>
  );
}

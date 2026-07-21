// Bottom-Tab-Bar (Entdecken · Erstellen · Chats · Profil) — Custom-Icons als
// einfache Geometrie wie im Design (Kreis, Plus-Kachel, Sprechblasen-Kachel).
import React from 'react';
import { View, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, pressedFx } from '../../src/ui';
import { colors, tabBarBottomPad } from '../../src/theme';

const TAB_META = {
  entdecken: { label: 'Entdecken', glyph: '', shape: 'circle' },
  erstellen: { label: 'Erstellen', glyph: '+', shape: 'square' },
  chats: { label: 'Chats', glyph: '', shape: 'bubble' },
  profil: { label: 'Profil', glyph: '', shape: 'circle' },
};

function TabIcon({ name, active }) {
  const meta = TAB_META[name];
  const isCreate = name === 'erstellen';
  const bg = active ? (isCreate ? colors.primary : colors.primarySoft) : 'transparent';
  const border = active ? colors.primary : colors.deco;
  const fg = isCreate ? (active ? colors.white : colors.deco) : active ? colors.primary : colors.deco;
  const radiusStyle =
    meta.shape === 'circle'
      ? { borderRadius: 13 }
      : meta.shape === 'bubble'
        ? { borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomRightRadius: 9, borderBottomLeftRadius: 2 }
        : { borderRadius: 9 };
  return (
    <View
      style={[
        {
          width: 26, height: 26, backgroundColor: bg, borderWidth: 2.5, borderColor: border,
          alignItems: 'center', justifyContent: 'center',
        },
        radiusStyle,
      ]}
    >
      {meta.glyph ? <T s={15} w={800} c={fg}>{meta.glyph}</T> : null}
    </View>
  );
}

function ZammaTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: colors.tabBarBg,
        borderTopWidth: 1, borderTopColor: colors.cardBorder,
        flexDirection: 'row', paddingTop: 8, paddingHorizontal: 8,
        paddingBottom: tabBarBottomPad(insets),
      }}
    >
      {state.routes.map((route, i) => {
        const active = state.index === i;
        const meta = TAB_META[route.name];
        if (!meta) return null;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={({ pressed }) => [
              { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, minHeight: 44 },
              pressedFx(pressed),
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={meta.label}
          >
            <TabIcon name={route.name} active={active} />
            <T s={10.5} w={800} c={active ? colors.primary : colors.disabled}>{meta.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <ZammaTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="entdecken" />
      <Tabs.Screen name="erstellen" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}

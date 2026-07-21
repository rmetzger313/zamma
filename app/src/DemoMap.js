// Stilisierte Kartenansicht (Demo) — Nachbau der Prototyp-Illustration.
// In Produktion durch echte Karte ersetzen (OpenStreetMap/Mapbox); die
// Pin-Positionen kommen dann aus einer Geo-Projektion statt aus mapX/mapY.
import React, { useEffect } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { T, pressedFx, useReducedMotion, useAnimatedValue } from './ui';
// Karten-Illustration ist ein Tages-Platzhalter (Produktion: echte Karte) und
// bleibt in beiden Themes hell — daher feste Farben + Light-Kategorien für vivide Pins.
import { categories } from './theme';

const PIN_W = 140;

function Pin({ event, onPress }) {
  const cat = categories[event.category];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          position: 'absolute',
          left: event.mapX ?? '50%',
          top: event.mapY ?? '36%',
          width: PIN_W,
          marginLeft: -PIN_W / 2,
          marginTop: -34,
          alignItems: 'center',
        },
        pressedFx(pressed),
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${cat.label}: ${event.title}`}
    >
      <View style={[styles.pinLabel, { backgroundColor: cat.color }]}>
        <T s={11} w={800} c={'#FFFFFF'}>{cat.label}</T>
      </View>
      <View style={[styles.pinTip, { backgroundColor: cat.color }]} />
    </Pressable>
  );
}

// Eigener Standort: pulsierender Terracotta-Punkt (statisch bei „Bewegung reduzieren")
function SelfDot() {
  const pulse = useAnimatedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);
  const ring = pulse.interpolate({ inputRange: [0, 1], outputRange: [4, 9] });
  return (
    <View style={styles.selfWrap} pointerEvents="none">
      <Animated.View
        style={{
          position: 'absolute',
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: 'rgba(224,93,56,.2)',
          transform: [{ scale: Animated.add(1, Animated.divide(ring, 7)) }],
        }}
      />
      <View style={styles.selfDot} />
    </View>
  );
}

export function DemoMap({ events, onOpen }) {
  return (
    <View style={styles.map}>
      {/* Straßenraster (angedeutet) */}
      <View style={[styles.street, { left: '48%', top: 0, bottom: 0, width: '4%' }]} />
      <View style={[styles.street, { left: 0, right: 0, top: '65%', height: '3%' }]} />
      <View style={[styles.street, { left: '-10%', right: '-10%', top: '38%', height: '2%', transform: [{ rotate: '35deg' }] }]} />
      {/* Grünflächen + Isar */}
      <View style={[styles.green, { left: '8%', top: '8%', width: '34%', height: '26%' }]} />
      <T s={10} w={800} c="#66A088" ls={0.5} style={{ position: 'absolute', left: '14%', top: '12%' }}>
        ENGLISCHER GARTEN
      </T>
      <View style={styles.isar} />
      <T s={10} w={800} c="#6E9DB8" ls={1} style={{ position: 'absolute', left: '56%', top: '44%', transform: [{ rotate: '76deg' }] }}>
        ISAR
      </T>
      <View style={[styles.green, { right: '6%', bottom: '22%', width: '28%', height: '20%', borderRadius: 20 }]} />
      <T s={10.5} w={700} c={'#A8A29E'} style={{ position: 'absolute', left: '20%', top: '44%' }}>Maxvorstadt</T>
      <T s={10.5} w={700} c={'#A8A29E'} style={{ position: 'absolute', left: '30%', bottom: '24%' }}>Altstadt</T>
      <T s={10.5} w={700} c={'#A8A29E'} style={{ position: 'absolute', right: '9%', top: '12%' }}>Waldkraiburg ↗</T>

      {events.map((e) => (
        <Pin key={e.id} event={e} onPress={() => onOpen(e)} />
      ))}
      <SelfDot />
      <View style={styles.demoTag}>
        <T s={11} w={700} c={'#78716C'}>Kartenansicht (Demo)</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#F5F5F4', overflow: 'hidden' },
  street: { position: 'absolute', backgroundColor: '#E7E5E4' },
  green: { position: 'absolute', backgroundColor: '#D8EDE0', borderRadius: 24 },
  isar: {
    position: 'absolute', left: '52%', top: '-6%', width: '12%', height: '115%',
    backgroundColor: '#CBE5F2', borderRadius: 40, transform: [{ rotate: '14deg' }],
  },
  pinLabel: {
    borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },
  pinTip: { width: 8, height: 8, transform: [{ rotate: '45deg' }], marginTop: -4 },
  selfWrap: {
    position: 'absolute', left: '50%', top: '58%', width: 14, height: 14,
    marginLeft: -7, marginTop: -7, alignItems: 'center', justifyContent: 'center',
  },
  selfDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF6B42',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  demoTag: {
    position: 'absolute', left: 16, bottom: 100, backgroundColor: '#FFFFFF',
    borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10,
  },
});

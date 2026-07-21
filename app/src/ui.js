// Basis-Komponenten des Design-Systems — pixelgenau nach Handoff-Tokens.
import React, { useEffect, useState } from 'react';
import { Text, View, Pressable, TextInput, StyleSheet, AccessibilityInfo, Animated } from 'react-native';
import { colors, font, radius } from './theme';

// RN-Web 0.21 kennt useAnimatedValue aus react-native noch nicht —
// Lazy-Init über useState ist äquivalent (stabil, kein Ref-Zugriff im Render).
export function useAnimatedValue(initial) {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}

// System-Einstellung „Bewegung reduzieren" (iOS/Android/Web via matchMedia)
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setReduced(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduced);
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduced;
}

// Tap-Feedback für alle interaktiven Flächen: leichtes Scale + Opacity.
// Bei „Bewegung reduzieren" nur Opacity (keine Transform-Bewegung).
export function pressedFx(pressed, reduced = false) {
  if (!pressed) return null;
  return reduced ? { opacity: 0.6 } : { opacity: 0.8, transform: [{ scale: 0.97 }] };
}

// Text mit Gewicht/Größe/Farbe: <T s={17} w={800}>…</T>
export function T({ s = 14, w = 600, c = colors.ink, lh, ls, center, style, children, ...rest }) {
  return (
    <Text
      style={[
        { fontFamily: font[w], fontSize: s, color: c },
        lh != null && { lineHeight: lh },
        ls != null && { letterSpacing: ls },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

// Abschnitts-Label: 13px/800 UPPERCASE in Muted
export function SectionLabel({ children, style }) {
  return (
    <T s={13} w={800} c={colors.muted} style={[{ marginBottom: 8 }, style]}>
      {children}
    </T>
  );
}

// Chip/Pill mit aktiv-Zustand (border 1.5, radius 999)
export function Chip({ label, active, color = colors.primaryDark, bg = colors.primarySoft,
  activeStyle, onPress, pad = { paddingVertical: 9, paddingHorizontal: 15 }, size = 14 }) {
  const st = active
    ? { backgroundColor: bg, borderColor: color }
    : { backgroundColor: colors.white, borderColor: colors.cardBorder };
  const textColor = active ? color : colors.secondary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pad, st, active && activeStyle, pressedFx(pressed)]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      <T s={size} w={700} c={active && activeStyle?.backgroundColor ? colors.white : textColor}>{label}</T>
    </Pressable>
  );
}

// Statische Badge-Pille (Kategorie, „Passt zu dir", wiederkehrend …)
export function Badge({ label, color, bg, size = 11.5, w = 800, pad = { paddingVertical: 4, paddingHorizontal: 10 }, style }) {
  return (
    <View style={[{ backgroundColor: bg, borderRadius: radius.pill }, pad, style]}>
      <T s={size} w={w} c={color}>{label}</T>
    </View>
  );
}

export function Card({ children, style, onPress, radiusSize = radius.cardLg, pad = 16 }) {
  const base = [styles.card, { borderRadius: radiusSize, padding: pad }, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...base, pressedFx(pressed)]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

// Avatar mit Initialen (rund oder Kachel)
export function Avatar({ initials, color, size = 28, square, textSize }) {
  return (
    <View
      style={{
        width: size, height: size,
        borderRadius: square ? 14 : size / 2,
        backgroundColor: color,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <T s={textSize ?? Math.round(size * 0.39)} w={800} c={colors.white}>{initials}</T>
    </View>
  );
}

// Skill-Dots „●○○" (Amber, letter-spacing 2)
export function SkillDots({ level, size = 12 }) {
  return (
    <T s={size} w={700} c={colors.amber} ls={2}>
      {'●'.repeat(level) + '○'.repeat(3 - level)}
    </T>
  );
}

// Grünes ✓-Badge (verifiziert)
export function VerifiedBadge({ size = 16 }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: colors.success,
        alignItems: 'center', justifyContent: 'center',
      }}
      accessible={true}
      accessibilityLabel="Verifiziert"
    >
      <T s={size * 0.62} w={800} c={colors.white}>✓</T>
    </View>
  );
}

// Skeleton-Baustein: pulsierende Platzhalterfläche (statisch bei Reduced-Motion)
export function Skeleton({ w = '100%', h = 14, r = 8, style }) {
  const [dim, setDim] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return undefined;
    const t = setInterval(() => setDim((d) => !d), 700);
    return () => clearInterval(t);
  }, [reduced]);
  return (
    <View
      style={[
        { width: w, height: h, borderRadius: r, backgroundColor: colors.divider, opacity: dim ? 0.55 : 1 },
        style,
      ]}
      accessibilityElementsHidden
    />
  );
}

// Skeleton einer Aktivitäts-Card (Feed lädt)
export function EventCardSkeleton() {
  return (
    <View style={[styles.card, { borderRadius: radius.cardLg, padding: 16, gap: 10 }]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton w={64} h={22} r={999} />
        <Skeleton w={96} h={22} r={999} />
      </View>
      <Skeleton w="75%" h={17} />
      <Skeleton w="55%" h={13} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <Skeleton w={28} h={28} r={14} />
        <Skeleton w={90} h={13} />
      </View>
    </View>
  );
}

// Text-Input mit Terracotta-Fokus-Rahmen (Prototyp: input:focus → #e05d38)
export function Input({ style, onFocus, onBlur, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.disabled}
      {...rest}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={[style, focused && { borderColor: colors.primary }]}
    />
  );
}

// Primär-Button: Terracotta, weißer Text, 16px/800, padding 16, radius 16
export function PrimaryButton({ label, onPress, disabled, bg, fg, style }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: bg ?? (disabled ? colors.btnDisabledBg : colors.primary) },
        style,
        !disabled && pressedFx(pressed),
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <T s={16} w={800} c={fg ?? (disabled ? colors.disabled : colors.white)} center>{label}</T>
    </Pressable>
  );
}

// Runder Back-Button (←)
export function BackButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.backBtn, pressedFx(pressed)]}
      accessibilityRole="button"
      accessibilityLabel="Zurück"
    >
      <T s={16} c={colors.ink}>←</T>
    </Pressable>
  );
}

export function Row({ children, gap, style, center }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: center === false ? 'flex-start' : 'center' }, gap != null && { gap }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  primaryBtn: {
    borderRadius: radius.btn,
    padding: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
});

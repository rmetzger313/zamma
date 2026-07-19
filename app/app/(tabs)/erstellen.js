// Erstellen: Titel, Kategorie-Chips, Level-Segmente, Datum/Uhrzeit, Treffpunkt,
// Wiederkehrend-Toggle. „Veröffentlichen" legt das Event an und springt in den Feed.
import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, Chip, SectionLabel, PrimaryButton, Row, Input } from '../../src/ui';
import { colors, categories, font, radius, tabBarHeight } from '../../src/theme';
import { api } from '../../src/api';

const inputStyle = {
  width: '100%',
  borderWidth: 1.5, borderColor: colors.cardBorder, borderRadius: radius.input,
  paddingVertical: 13, paddingHorizontal: 14,
  fontSize: 15, fontFamily: font[600], color: colors.ink, backgroundColor: colors.white,
};

// Default-Datum: nächste Woche, gleicher Stil wie das Design ("Sa, 25.07.")
function defaultDate() {
  const d = new Date(Date.now() + 7 * 86400000);
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()];
  const p = (n) => String(n).padStart(2, '0');
  return `${wd}, ${p(d.getDate())}.${p(d.getMonth() + 1)}.`;
}

export default function Erstellen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('sport');
  const [skill, setSkill] = useState(1);
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState('18:00');
  const [ort, setOrt] = useState('');
  const [rec, setRec] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const knob = useRef(new Animated.Value(0)).current;

  const toggleRec = () => {
    Animated.timing(knob, { toValue: rec ? 0 : 1, duration: 200, useNativeDriver: false }).start();
    setRec(!rec);
  };

  const publish = async () => {
    if (!title.trim()) { setTitleError(true); return; }
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.createEvent({
        title: title.trim(),
        category: cat,
        skillLevel: skill,
        date, time,
        locationName: ort.trim(),
        recurrence: rec ? 'weekly' : null,
      });
      setTitle(''); setOrt(''); setRec(false); knob.setValue(0); setTitleError(false);
      router.push('/(tabs)/entdecken'); // neue Card erscheint oben im Feed
    } catch (e) {
      setError(e.message || 'Veröffentlichen fehlgeschlagen — bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 10 }}>
        <T s={20} w={800}>Neue Verabredung</T>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 200, gap: 16 }}
      >
        <View>
          <SectionLabel style={{ marginBottom: 7 }}>TITEL</SectionLabel>
          <Input
            value={title}
            onChangeText={(t) => { setTitle(t); if (t.trim()) setTitleError(false); }}
            placeholder="z. B. Feierabend-Radrunde"
            accessibilityLabel="Titel"
            style={[inputStyle, titleError && { borderColor: colors.primaryDark }]}
          />
          {titleError ? (
            <T s={12.5} w={700} c={colors.primaryDark} style={{ marginTop: 6 }}>Bitte gib einen Titel ein.</T>
          ) : null}
        </View>
        <View>
          <SectionLabel style={{ marginBottom: 7 }}>KATEGORIE</SectionLabel>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {Object.entries(categories).map(([id, c]) => (
              <Chip
                key={id} label={c.label} size={13.5}
                pad={{ paddingVertical: 8, paddingHorizontal: 14 }}
                active={cat === id} color={c.color} bg={c.bg}
                onPress={() => setCat(id)}
              />
            ))}
          </Row>
        </View>
        <View>
          <SectionLabel style={{ marginBottom: 7 }}>LEVEL</SectionLabel>
          <Row gap={8}>
            {[1, 2, 3].map((n) => {
              const active = skill === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setSkill(n)}
                  style={{
                    flex: 1, borderWidth: 1.5, borderRadius: 12,
                    paddingVertical: 10, paddingHorizontal: 4, minHeight: 44,
                    alignItems: 'center', justifyContent: 'center',
                    borderColor: active ? colors.amber : colors.cardBorder,
                    backgroundColor: active ? colors.amberSoft : colors.white,
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <T s={13} w={700} c={active ? colors.amber : colors.secondary}>
                    {['Alle Level', 'Fortgeschritten', 'Profi'][n - 1]}
                  </T>
                </Pressable>
              );
            })}
          </Row>
        </View>
        <Row gap={10} center={false}>
          <View style={{ flex: 1 }}>
            <SectionLabel style={{ marginBottom: 7 }}>DATUM</SectionLabel>
            <Input value={date} onChangeText={setDate} accessibilityLabel="Datum" style={inputStyle} />
          </View>
          <View style={{ flex: 1 }}>
            <SectionLabel style={{ marginBottom: 7 }}>UHRZEIT</SectionLabel>
            <Input value={time} onChangeText={setTime} accessibilityLabel="Uhrzeit" style={inputStyle} />
          </View>
        </Row>
        <View>
          <SectionLabel style={{ marginBottom: 7 }}>TREFFPUNKT</SectionLabel>
          <Input
            value={ort} onChangeText={setOrt}
            placeholder="z. B. Marienplatz, München"
            accessibilityLabel="Treffpunkt"
            style={inputStyle}
          />
        </View>
        <Pressable
          onPress={toggleRec}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.cardBorder,
            borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14,
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: rec }}
        >
          <View>
            <T s={14.5} w={800}>Wiederkehrend</T>
            <T s={12.5} w={600} c={colors.muted}>Wöchentlich zur gleichen Zeit</T>
          </View>
          <View
            style={{
              marginLeft: 'auto', width: 46, height: 28, borderRadius: 999,
              backgroundColor: rec ? colors.success : colors.dashedBorder,
            }}
          >
            <Animated.View
              style={{
                position: 'absolute', top: 3,
                left: knob.interpolate({ inputRange: [0, 1], outputRange: [3, 21] }),
                width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </View>
        </Pressable>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight(insets) }}>
        <LinearGradient colors={['rgba(250,246,240,0)', colors.bg]} locations={[0, 0.4]} style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 10 }}>
          {error ? (
            <T s={13} w={700} c={colors.primaryDark} center style={{ marginBottom: 8 }}>{error}</T>
          ) : null}
          <PrimaryButton label={busy ? 'Wird veröffentlicht…' : 'Veröffentlichen'} onPress={publish} />
        </LinearGradient>
      </View>
    </View>
  );
}

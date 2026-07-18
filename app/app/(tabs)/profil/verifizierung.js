// Verifizierung: großes ✓, 3 Schritte-Cards, Regel-Box (Badge-Entzug).
import React from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, BackButton, Card, Row } from '../../../src/ui';
import { colors } from '../../../src/theme';
import { api, useApi } from '../../../src/api';

export default function Verifizierung() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: v } = useApi(api.verification, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Row gap={10} style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8 }}>
        <BackButton onPress={() => router.back()} />
        <T s={15} w={800}>Verifizierung</T>
      </Row>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 96 }}>
        <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 20 }}>
          <View
            style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: v?.fullyVerified ? colors.success : colors.amberSoft,
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}
          >
            <T s={28} w={800} c={v?.fullyVerified ? colors.white : colors.amber}>
              {v?.fullyVerified ? '✓' : '…'}
            </T>
          </View>
          <T s={19} w={800}>
            {v?.fullyVerified ? 'Du bist voll verifiziert' : 'Verifiziere dein Profil'}
          </T>
          <T s={13} w={600} c={colors.muted} style={{ marginTop: 4 }}>
            Verifizierte Profile werden 3× häufiger angenommen
          </T>
        </View>
        <View style={{ gap: 10, marginBottom: 18 }}>
          {(v?.steps ?? []).map((s) => (
            <Card key={s.key} radiusSize={16} pad={0} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
              <Row gap={12}>
                <View
                  style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: s.done ? colors.successSoft : colors.amberSoft,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <T s={14} w={800} c={s.done ? colors.success : colors.amber}>{s.done ? '✓' : '•'}</T>
                </View>
                <View style={{ flexShrink: 1 }}>
                  <T s={14.5} w={800}>{s.title}</T>
                  <T s={12.5} w={600} c={colors.muted} lh={17.5}>{s.sub}</T>
                </View>
              </Row>
            </Card>
          ))}
        </View>
        <View style={{ backgroundColor: colors.divider, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15 }}>
          <T s={12.5} w={600} c={colors.muted} lh={18.75}>
            So schützt Zamma die Community: Wer zweimal unentschuldigt fehlt, verliert das
            Verifizierungs-Badge und wird in der Suche nachrangig angezeigt.
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

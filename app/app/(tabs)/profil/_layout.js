import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../../src/theme';

export default function ProfilLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  );
}

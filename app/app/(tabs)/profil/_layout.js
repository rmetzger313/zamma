import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '../../../src/theme-context';

export default function ProfilLayout() {
  const colors = useColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  );
}

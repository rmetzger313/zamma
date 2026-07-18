import { Redirect } from 'expo-router';
import { useAppState } from '../src/state';

export default function Index() {
  const { onboarded } = useAppState();
  return <Redirect href={onboarded ? '/(tabs)/entdecken' : '/onboarding'} />;
}

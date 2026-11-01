import { Redirect } from 'expo-router';
import { useApp } from '../lib/store';

export default function Index() {
  const { prefs } = useApp();
  return <Redirect href={prefs.onboarded ? '/(tabs)' : '/onboarding'} />;
}

import { Stack } from 'expo-router';

// Onboarding: welcome → setup → (fund) → profile → mode → Home
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080812' } }} />;
}

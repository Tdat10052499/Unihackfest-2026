import { gradients } from '@/constants/design';
import { Stack } from 'expo-router';

// Onboarding: welcome → setup → consent → (fund) → profile → residence → Home; D30 adds role, country, business, agreement
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: gradients.screen[2] } }} />;
}

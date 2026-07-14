import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

import { SessionProvider, useSession } from '@/context/SessionContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { LockScreen } from '@/screens/LockScreen';
import { ActivityIndicator, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { appLoading, isLoggedIn, isLocked, isRegistered } = useSession();
  const colorScheme = useColorScheme();

  if (appLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#F4F6F9' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!isRegistered || !isLoggedIn) {
    return <AuthScreen />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <>
      <AnimatedSplashOverlay />
      <AppTabs />
    </>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppContent />
      </ThemeProvider>
    </SessionProvider>
  );
}

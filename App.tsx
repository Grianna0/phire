import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation/types';
import HomeScreen from './screens/Home';
import OnboardingScreen from './screens/Onboarding';
import SettingsScreen from './screens/Settings';
import FocusSessionScreen from './screens/FocusSession';
import SessionCompleteScreen from './screens/SessionComplete';
import StatsScreen from './screens/Stats';
import DevToolsScreen from './screens/DevTools';
import { useAppStore } from './store/useAppStore';
import { useHasHydrated } from './store/useHasHydrated';
import { BackgroundAudio } from './lib/useBackgroundAudio';
import AudioHeaderControls from './components/AudioHeaderControls';
import { HomeHeaderLeft, HomeHeaderRight } from './components/HomeHeader';
import { colors, fontAssets, fonts } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Light header for secondary screens (Stats, Settings).
const headerOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.deepAccent,
  headerTitleStyle: { fontFamily: fonts.bold },
  headerTitleAlign: 'center',
};

// Home: skill on the left; audio, stats and settings on the right; no title.
const homeHeaderOptions: NativeStackNavigationOptions = {
  ...headerOptions,
  title: 'Phire', // used for the browser tab / accessibility
  headerTitle: '',
  headerLeft: () => <HomeHeaderLeft />,
  headerRight: () => <HomeHeaderRight />,
};

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.fireStart,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  // Ionicons is loaded up front so header icons don't pop in.
  const [fontsLoaded, fontError] = useFonts({ ...fontAssets, ...Ionicons.font });
  const hydrated = useHasHydrated();
  const onboarded = useAppStore((s) => s.onboarded);

  // Wait for saved data so onboarded users never see Onboarding flash.
  // Fall back to system fonts if loading fails rather than blocking the app.
  if (!hydrated || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          {/* Global looping music: lives above the screens so it keeps playing across navigation. */}
          <BackgroundAudio />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            {/* Switching on `onboarded` replaces Onboarding with Home once it's completed. */}
            {onboarded ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} options={{ ...homeHeaderOptions, animation: 'fade' }} />
                <Stack.Screen
                  name="Stats"
                  component={StatsScreen}
                  options={{ ...headerOptions, title: 'Stats', headerRight: () => <AudioHeaderControls edgePadding /> }}
                />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{ ...headerOptions, title: 'Settings' }}
                />
                {/* DEV ONLY: testing hub (not registered in release builds). */}
                {__DEV__ && (
                  <Stack.Screen
                    name="DevTools"
                    component={DevToolsScreen}
                    options={{ ...headerOptions, title: 'Developer tools' }}
                  />
                )}
                {/* Distraction-free: no header, no swipe back (back is intercepted inside the screen). */}
                <Stack.Screen
                  name="FocusSession"
                  component={FocusSessionScreen}
                  options={{
                    gestureEnabled: false,
                    animation: 'fade',
                    contentStyle: { backgroundColor: colors.focusBackground },
                  }}
                />
                <Stack.Screen
                  name="SessionComplete"
                  component={SessionCompleteScreen}
                  options={{ gestureEnabled: false, animation: 'fade' }}
                />
              </>
            ) : (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

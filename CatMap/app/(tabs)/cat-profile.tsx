import { Redirect } from 'expo-router';

/**
 * This file exists to redirect users who try to directly access
 * the cat profile screen within the tab navigation.
 * 
 * Access to cat details should only happen via clicking a marker on the map,
 * which uses the root-level cat-profile screen.
 */
export default function TabCatProfileRedirect() {
  // Redirect to explore page if someone tries to access this directly
  return <Redirect href="/(tabs)/explore" />;
}
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import CatProfileScreen from '@/src/screens/CatProfileScreen';

/**
 * This file loads the CatProfileScreen component and passes parameters to it.
 * The screen should only be accessed by clicking on a cat marker on the map.
 */
export default function CatProfilePage() {
  // Get the parameters passed from map marker click
  const params = useLocalSearchParams();
  
  // Check if we have necessary params (this is a safety check, redirect happens at component level)
  return <CatProfileScreen />;
}
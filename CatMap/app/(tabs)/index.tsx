import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { app } from '@/src/config/firebase';

export default function HomeScreen() {
  useEffect(() => {
    if (app) {
      console.log('Firebase initialized successfully:', app);
    } else {
      console.error('Firebase initialization failed');
    }
  }, []);
  
  const handleSignOut = () => {
    console.log('Sign out button pressed');
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Welcome to CatMap</ThemedText>
        <ThemedText style={styles.subtitle}>Find and share cat sightings around you!</ThemedText>
      </ThemedView>
      <ThemedView style={styles.featuresContainer}>
        <ThemedText type="subtitle">Features coming soon:</ThemedText>
        <ThemedText>• Cat photo uploads with geolocation</ThemedText>
        <ThemedText>• Interactive map of cat sightings</ThemedText>
        <ThemedText>• User profiles</ThemedText>
        <ThemedText>• Comments and likes</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.buttonContainer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <ThemedText style={styles.signOutText}>Test Firebase</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  featuresContainer: {
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    padding: 16,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#A1CEDC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

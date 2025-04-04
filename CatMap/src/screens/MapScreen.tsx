import React from 'react';
import { StyleSheet, Dimensions, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const { width, height } = Dimensions.get('window');

// Placeholder component that works on all platforms
export default function MapScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Cat Map</ThemedText>
      <ThemedText style={styles.message}>
        {Platform.OS === 'web' 
          ? 'Maps are currently only available on mobile devices.'
          : 'Interactive map will be displayed here.'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
  },
});
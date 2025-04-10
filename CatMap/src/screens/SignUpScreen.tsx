import React from 'react';
import { StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function SignUpScreen() {
  const router = useRouter();

  const handleSignUp = () => {
    // Bypass authentication and go straight to the main app
    router.replace('/(tabs)');
  };

  const navigateToSignIn = () => {
    router.push('/sign-in');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={styles.formContainer}>
        <ThemedText type="title" style={styles.title}>Create CatMap Account</ThemedText>
        
        <ThemedText style={styles.description}>
          Authentication temporarily disabled for development.
        </ThemedText>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleSignUp}
        >
          <ThemedText style={styles.buttonText}>Continue to App</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={navigateToSignIn}>
          <ThemedText style={styles.linkText}>
            Already have an account? Sign In
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#A1CEDC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    marginTop: 20,
    color: '#A1CEDC',
  },
});
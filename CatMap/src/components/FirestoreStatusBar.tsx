import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '@/src/config/firebase';
import NetInfo from '@react-native-community/netinfo';
import { enableNetwork, disableNetwork, waitForPendingWrites } from 'firebase/firestore';
import { isFirestoreAvailable } from '@/src/utils/firestoreHelpers';

type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'error';

interface FirestoreStatusBarProps {
  onRetry?: () => void;
}

const FirestoreStatusBar: React.FC<FirestoreStatusBarProps> = ({ onRetry }) => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [visible, setVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  useEffect(() => {
    // Initial check
    checkConnection();
    
    // Set up listener for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        setStatus('connecting');
        enableNetwork(firestore)
          .then(() => {
            setStatus('online');
            setErrorMessage(null);
            setTimeout(() => hideStatusBar(), 3000); // Hide after 3 seconds when online
          })
          .catch(error => {
            console.error('Firestore connection error:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to connect to database.');
            showStatusBar();
          });
      } else {
        setStatus('offline');
        setErrorMessage('You are currently offline. Some features may be limited.');
        showStatusBar();
        
        // Disable network in Firestore to use cached data
        disableNetwork(firestore).catch(error => {
          console.error('Error disabling Firestore network:', error);
        });
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  const checkConnection = async () => {
    setStatus('connecting');
    showStatusBar();
    
    const state = await NetInfo.fetch();
    console.log('FirestoreStatusBar - Network state:', state);
    
    if (state.isConnected) {
      try {
        // Check if Firestore is actually available
        const available = await isFirestoreAvailable();
        console.log('FirestoreStatusBar - Firestore available:', available);
        
        if (available) {
          // Test pending writes
          await waitForPendingWrites(firestore);
          
          setStatus('online');
          setErrorMessage(null);
          setTimeout(() => hideStatusBar(), 3000);
        } else {
          setStatus('error');
          setErrorMessage('Firestore is not responding. Some features may be limited.');
          showStatusBar();
        }
      } catch (error) {
        console.error('FirestoreStatusBar - Connection check error:', error);
        setStatus('error');
        setErrorMessage('Firestore connection error: ' + (error.message || 'Unknown error'));
        showStatusBar();
      }
    } else {
      setStatus('offline');
      setErrorMessage('You are currently offline. Some features may be limited.');
      showStatusBar();
    }
  };
  
  const showStatusBar = () => {
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  const hideStatusBar = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };
  
  const handleRetry = () => {
    setStatus('connecting');
    showStatusBar();
    
    if (onRetry) {
      onRetry();
    }
    
    checkConnection();
  };
  
  if (!visible && status === 'online') {
    return null;
  }
  
  const statusConfig = {
    online: {
      icon: 'checkmark-circle',
      color: '#4CAF50',
      message: 'Connected to the database',
    },
    offline: {
      icon: 'cloud-offline',
      color: '#FF9800',
      message: errorMessage || 'You are offline. App will use cached data.',
    },
    connecting: {
      icon: 'sync',
      color: '#2196F3',
      message: 'Connecting to the database...',
    },
    error: {
      icon: 'alert-circle',
      color: '#F44336',
      message: errorMessage || 'Connection error. Please try again later.',
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.color, opacity: fadeAnim },
        status === 'online' && styles.onlineContainer,
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={config.icon as any} size={20} color="white" />
        <ThemedText style={styles.text}>{config.message}</ThemedText>
      </View>
      
      {(status === 'error' || status === 'offline') && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Ionicons name="refresh" size={18} color="white" />
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
  },
  onlineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  text: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FirestoreStatusBar;
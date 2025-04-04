import { Platform } from 'react-native';
import { initializeApp, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  disableNetwork,
  enableNetwork,
  waitForPendingWrites,
  getFirestore,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZo89tAhJSWP8W7vmoLUH45Y9B7zHhKmI",
  authDomain: "catmaps-13217.firebaseapp.com",
  projectId: "catmaps-13217",
  storageBucket: "catmaps-13217.firebasestorage.app",
  messagingSenderId: "752389114504",
  appId: "1:752389114504:web:d3f1fa9543f3dd2c0d6d3d"
};

// Log version information
const FIREBASE_SDK_VERSION = '10.14.1'; // Match with package.json
console.log(`Firebase SDK version: ${FIREBASE_SDK_VERSION}`);

// Initialize Firebase
let app;
try {
  // Try to get the existing app instance
  app = getApp();
  console.log('Using existing Firebase app instance');
} catch (error) {
  // Initialize a new app if none exists
  app = initializeApp(firebaseConfig);
  console.log('New Firebase app instance created');
}

// Log Firebase configuration for verification (without sensitive info)
console.log('Firebase Configuration:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
  // Omitting apiKey and appId for security
});

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore with enhanced configuration for better connectivity
const firestoreSettings = { 
  experimentalForceLongPolling: true, // Use long polling instead of WebSockets
  // experimentalAutoDetectLongPolling: true, // Cannot be used with experimentalForceLongPolling
  cacheSizeBytes: CACHE_SIZE_UNLIMITED, // Maximum cache size for offline support
  ignoreUndefinedProperties: true, // Be more tolerant of undefined values in documents
};

console.log('Initializing Firestore with settings:', JSON.stringify(firestoreSettings));
const firestore = initializeFirestore(app, firestoreSettings);

// Enable Firestore offline persistence
if (Platform.OS !== 'web') {
  enableIndexedDbPersistence(firestore)
    .then(() => {
      console.log('Firestore offline persistence enabled successfully');
    })
    .catch((error) => {
      console.error('Error enabling Firestore offline persistence:', error);
      if (error.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (error.code === 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
      }
    });
}

// Enhanced network state tracking
let firestoreNetworkEnabled = true;
let lastNetInfoState: NetInfoState | null = null;
let connectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY_MS = 3000; // 3 seconds delay between reconnection attempts

// Get initial network state
NetInfo.fetch().then(state => {
  lastNetInfoState = state;
  console.log('Initial network state:', {
    isConnected: state.isConnected,
    type: state.type,
    details: state.details,
    isInternetReachable: state.isInternetReachable
  });
});

// Enhanced network monitoring for Firestore
NetInfo.addEventListener(state => {
  const newIsConnected = !!state.isConnected;
  const wasConnected = lastNetInfoState?.isConnected === true;
  
  // Update last known state
  lastNetInfoState = state;
  
  // Log detailed network information
  console.log('Network state changed:', {
    isConnected: newIsConnected,
    connectionType: state.type,
    isInternetReachable: state.isInternetReachable,
    details: state.details,
    firestoreNetworkEnabled: firestoreNetworkEnabled
  });
  
  // Handle connection state changes
  if (newIsConnected && !wasConnected) {
    // Device reconnected to the internet
    console.log('Device reconnected to the internet. Attempting to re-enable Firestore network.');
    connectionAttempts = 0;
    attemptReconnect();
  } else if (!newIsConnected && wasConnected) {
    // Device lost internet connection
    console.log('Device lost internet connection. Disabling Firestore network to use cached data.');
    firestoreNetworkEnabled = false;
    disableNetwork(firestore)
      .then(() => {
        console.log('Firestore network disabled, app will use cached data');
      })
      .catch(error => {
        console.error('Error disabling Firestore network:', error);
      });
  }
});

// Function to attempt reconnection with retries
async function attemptReconnect() {
  connectionAttempts++;
  
  if (connectionAttempts > MAX_RECONNECTION_ATTEMPTS) {
    console.warn(`Maximum reconnection attempts (${MAX_RECONNECTION_ATTEMPTS}) reached. Waiting for next connection event.`);
    return;
  }
  
  try {
    console.log(`Attempt ${connectionAttempts}/${MAX_RECONNECTION_ATTEMPTS} to enable Firestore network`);
    await enableNetwork(firestore);
    firestoreNetworkEnabled = true;
    console.log('Firestore network connection re-enabled successfully');
    // Test the connection
    testFirestoreConnection();
  } catch (error) {
    console.error(`Error re-enabling Firestore network (attempt ${connectionAttempts}):`, error);
    
    // Schedule another attempt
    console.log(`Scheduling another attempt in ${RECONNECTION_DELAY_MS}ms`);
    setTimeout(attemptReconnect, RECONNECTION_DELAY_MS);
  }
}

// Enhanced Firestore connection test
const testFirestoreConnection = async () => {
  try {
    console.log('Testing Firestore connection...');
    // Wait for any pending writes to complete
    await waitForPendingWrites(firestore);
    
    // Log Firestore configuration for debugging
    console.log('Current Firestore settings:', {
      longPollingEnabled: firestoreSettings.experimentalForceLongPolling,
      autoDetectLongPolling: firestoreSettings.experimentalAutoDetectLongPolling,
      networkEnabled: firestoreNetworkEnabled
    });
    
    console.log('Firestore connection test successful');
    return true;
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    
    // Check if we should retry enabling the network
    if (lastNetInfoState?.isConnected && error.code === 'unavailable') {
      console.log('Detected unavailable error with connected network, attempting to recover...');
      setTimeout(attemptReconnect, RECONNECTION_DELAY_MS);
    }
    
    return false;
  }
};

// Run the connection test
testFirestoreConnection();

const storage = getStorage(app);

export { app, auth, firestore, storage };
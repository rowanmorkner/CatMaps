import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { firestore } from '@/src/config/firebase';
import { query, collection, getDocs, limit } from 'firebase/firestore';

/**
 * Network diagnostics utility
 * Provides functions to test and log network and Firestore connectivity
 */

// Network connection details
export const getNetworkInfo = async () => {
  const netInfo = await NetInfo.fetch();
  
  return {
    isConnected: netInfo.isConnected,
    type: netInfo.type,
    isInternetReachable: netInfo.isInternetReachable,
    details: netInfo.details,
  };
};

// Firestore connection test
export const testFirestoreConnection = async () => {
  try {
    console.log('Testing Firestore connection...');
    const startTime = Date.now();
    
    // Try to fetch a small amount of data (limit 1) from the cats collection
    const q = query(collection(firestore, 'cats'), limit(1));
    await getDocs(q);
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`Firestore connection test successful, latency: ${latency}ms`);
    return {
      connected: true,
      latency,
      error: null
    };
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    return {
      connected: false,
      latency: null,
      error: error.message || 'Unknown error'
    };
  }
};

// Test all connections and generate a diagnostic report
export const generateDiagnosticReport = async () => {
  console.log('Generating diagnostic report...');
  
  const networkInfo = await getNetworkInfo();
  const firestoreTest = await testFirestoreConnection();
  
  const report = {
    timestamp: new Date().toISOString(),
    device: {
      platform: Platform.OS,
      version: Platform.Version,
    },
    network: networkInfo,
    firestore: firestoreTest,
  };
  
  console.log('Diagnostic report:', JSON.stringify(report, null, 2));
  return report;
};

// Monitor and log changes in network status
export const startNetworkMonitoring = (
  onStatusChange?: (status: { isConnected: boolean, type: string }) => void
) => {
  console.log('Starting network monitoring...');
  
  const unsubscribe = NetInfo.addEventListener(state => {
    const status = {
      isConnected: !!state.isConnected,
      type: state.type,
    };
    
    console.log('Network status changed:', status);
    
    if (onStatusChange) {
      onStatusChange(status);
    }
  });
  
  return unsubscribe;
};

// Test connectivity on different networks
export const testDifferentNetwork = async (networkName: string) => {
  console.log(`Testing on network: ${networkName}`);
  
  try {
    const networkInfo = await getNetworkInfo();
    const firestoreTest = await testFirestoreConnection();
    
    console.log(`Network "${networkName}" test results:`, {
      network: networkInfo,
      firestore: firestoreTest
    });
    
    return {
      networkName,
      networkInfo,
      firestoreTest,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error testing network "${networkName}":`, error);
    return {
      networkName,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};
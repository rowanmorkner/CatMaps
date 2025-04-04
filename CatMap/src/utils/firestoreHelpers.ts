/**
 * Firestore helper utilities for robust error handling and retry logic
 */
import { 
  addDoc, 
  collection, 
  Firestore, 
  DocumentData, 
  CollectionReference,
  DocumentReference,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import NetInfo from '@react-native-community/netinfo';

/**
 * Maximum number of retry attempts for Firestore operations
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Delay between retry attempts (in ms)
 */
const RETRY_DELAY_MS = 2000;

/**
 * Firestore error codes that are worth retrying
 */
const RETRYABLE_ERROR_CODES = [
  'unavailable',
  'resource-exhausted',
  'deadline-exceeded',
  'cancelled',
  'internal',
];

/**
 * Checks if a Firestore error is retryable
 * @param error Error from Firestore operation
 * @returns Boolean indicating if retry might succeed
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Check for known retryable error codes
  if (error.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
    return true;
  }
  
  // Check for network related errors
  if (error.message && (
    error.message.includes('network error') ||
    error.message.includes('offline') ||
    error.message.includes('unavailable') ||
    error.message.includes('failed to get') ||
    error.message.includes('internal error') ||
    error.message.includes('timeout')
  )) {
    return true;
  }
  
  return false;
}

/**
 * Adds a document to Firestore with retry logic
 * @param collectionPath The Firestore collection path
 * @param data Document data to add
 * @param useServerTimestamp Whether to add server timestamps for createdAt/updatedAt
 * @returns Promise with DocumentReference
 */
export async function addDocumentWithRetry(
  collectionPath: string,
  data: DocumentData,
  useServerTimestamp: boolean = true
): Promise<DocumentReference<DocumentData>> {
  let attempts = 0;
  let lastError: any = null;

  // First check if we have a network connection
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    console.warn('No network connection detected. Document will be queued for background sync.');
  }
  
  // Add timestamps
  const dataWithTimestamps = {
    ...data,
    createdAt: useServerTimestamp ? serverTimestamp() : new Date().toISOString(),
    updatedAt: useServerTimestamp ? serverTimestamp() : new Date().toISOString(),
  };
  
  while (attempts < MAX_RETRY_ATTEMPTS) {
    try {
      attempts++;
      console.log(`Attempt ${attempts}/${MAX_RETRY_ATTEMPTS} to add document to ${collectionPath}`);
      
      const collectionRef = collection(firestore, collectionPath);
      const docRef = await addDoc(collectionRef, dataWithTimestamps);
      
      console.log(`Document added successfully with ID: ${docRef.id}`);
      return docRef;
    } catch (error) {
      lastError = error;
      console.error(`Error adding document (attempt ${attempts}):`, error);
      
      if (!isRetryableError(error) || attempts >= MAX_RETRY_ATTEMPTS) {
        break;
      }
      
      // Wait before retry
      console.log(`Waiting ${RETRY_DELAY_MS}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  
  // If we got here, all retries failed
  throw lastError || new Error(`Failed to add document after ${MAX_RETRY_ATTEMPTS} attempts`);
}

/**
 * Gets a collection reference with type safety
 * @param path The path to the collection
 * @returns A typed CollectionReference
 */
export function getTypedCollection<T = DocumentData>(
  path: string
): CollectionReference<T> {
  return collection(firestore, path) as CollectionReference<T>;
}

/**
 * Check if Firestore is available
 * Tests if Firestore operations are likely to succeed
 * @returns Promise<boolean> indicating if Firestore operations should work
 */
export async function isFirestoreAvailable(): Promise<boolean> {
  // First check network connectivity
  const networkState = await NetInfo.fetch();
  if (!networkState.isConnected) {
    console.log('Network is disconnected, Firestore will use offline persistence');
    return false;
  }
  
  try {
    // Try to get a reference to a test collection
    const testCollection = collection(firestore, '_connectionTest');
    
    // Just getting a reference should work if Firestore is initialized properly
    return true;
  } catch (error) {
    console.error('Firestore seems unavailable:', error);
    return false;
  }
}
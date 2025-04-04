import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Dimensions, Platform, View, Alert, ActivityIndicator, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { firestore } from '@/src/config/firebase';
import { collection, getDocs, query, onSnapshot } from 'firebase/firestore';
import { getTypedCollection, isFirestoreAvailable } from '@/src/utils/firestoreHelpers';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import FirestoreStatusBar from '@/src/components/FirestoreStatusBar';
import { generateDiagnosticReport, startNetworkMonitoring } from '@/src/utils/diagnostics';

const { width, height } = Dimensions.get('window');

// Default region (San Francisco) as fallback
const defaultRegion = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Sample cat marker data as fallback if Firebase fails
const sampleCatMarkers = [
  {
    id: '1',
    title: 'Whiskers',
    description: 'Orange tabby cat seen here daily',
    latitude: 37.785834,
    longitude: -122.406417,
  },
  {
    id: '2',
    title: 'Shadow',
    description: 'Black cat with white paws, very friendly',
    latitude: 37.780634,
    longitude: -122.412567,
  },
  {
    id: '3',
    title: 'Luna',
    description: 'Gray cat with blue collar, appears in evenings',
    latitude: 37.790305,
    longitude: -122.402801,
  },
  {
    id: '4',
    title: 'Oliver',
    description: 'Brown striped cat, likes to be petted',
    latitude: 37.776582,
    longitude: -122.416921,
  },
  {
    id: '5',
    title: 'Mittens',
    description: 'Calico cat with distinctive white mittens',
    latitude: 37.784514,
    longitude: -122.423280,
  },
];

export default function MapScreen() {
  const router = useRouter();
  
  // Map and location state
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(defaultRegion);
  const mapRef = useRef(null);
  
  // UI state management
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [firebaseError, setFirebaseError] = useState(null);
  const [loadingCats, setLoadingCats] = useState(true);
  
  // Button interaction state
  const [recenterLoading, setRecenterLoading] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  
  // Data state
  const [catMarkers, setCatMarkers] = useState([]);
  
  // Connection state
  const [isOnline, setIsOnline] = useState(true);
  
  // Constants for zoom control
  const ZOOM_FACTOR = 1.5; // Factor to multiply/divide delta by when zooming
  const ANIMATION_DURATION = 300; // Duration of animation in milliseconds

  // This function has been replaced by a new implementation below

  /**
   * Fetches cat post markers from Firestore with enhanced error handling
   * - Checks Firestore availability first
   * - Queries the 'catPosts' collection
   * - Validates required fields
   * - Formats data for map display
   * - Handles errors with appropriate fallbacks
   * - Implements retry logic for transient failures
   */
  const fetchCatMarkers = useCallback(async () => {
    console.log('Starting fetchCatMarkers');
    const MAX_RETRIES = 3;
    let retryCount = 0;
    
    const attemptFetch = async () => {
      try {
        setLoadingCats(true);
        
        // First check if Firestore is available
        const firestoreAvailable = await isFirestoreAvailable();
        console.log('Firestore availability check:', firestoreAvailable);
        
        if (!firestoreAvailable && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Firestore unavailable, retry ${retryCount}/${MAX_RETRIES} in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptFetch(); // Recursively retry
        }
        
        // Using getTypedCollection for better type safety
        const catPostsCollection = getTypedCollection('catPosts');
        
        // Add a short delay to allow Firebase to initialize properly
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          console.log('Fetching cat posts from Firestore...');
          const snapshot = await getDocs(catPostsCollection);
          
          // Map Firestore documents to JavaScript objects
          const catData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Ensure latitude and longitude are numbers
              latitude: typeof data.latitude === 'number' 
                ? data.latitude 
                : parseFloat(data.latitude),
              longitude: typeof data.longitude === 'number' 
                ? data.longitude 
                : parseFloat(data.longitude),
            };
          });
          
          console.log('Fetched cat posts:', catData.length);
          
          // Validate and filter the data to ensure it has required fields for map display
          const validCatData = catData.filter(cat => {
            const hasRequiredFields = 
              cat.imageUrl && // Must have an image URL for thumbnail
              cat.latitude && 
              cat.longitude &&
              !isNaN(Number(cat.latitude)) && 
              !isNaN(Number(cat.longitude));
              
            if (!hasRequiredFields) {
              console.warn(`Cat post ${cat.id} missing required fields:`, {
                hasImageUrl: !!cat.imageUrl,
                hasLatitude: !!cat.latitude,
                hasLongitude: !!cat.longitude,
                validLatitude: !isNaN(Number(cat.latitude)),
                validLongitude: !isNaN(Number(cat.longitude)),
              });
            }
            
            return hasRequiredFields;
          });
          
          if (validCatData.length > 0) {
            console.log('Valid cat posts for map display:', validCatData.length);
            setCatMarkers(validCatData);
            setFirebaseError(null);
          } else if (catData.length > 0) {
            console.warn('Cat posts found but missing required fields for map display');
            setFirebaseError('Cat posts found but missing required fields for map display');
            setCatMarkers(sampleCatMarkers); // Fallback to sample data
          } else {
            console.log('No cat posts found');
            setFirebaseError('No cat posts found');
            setCatMarkers(sampleCatMarkers); // Fallback to sample data
          }
        } catch (error) {
          console.error('Error fetching cat posts:', error);
          
          // Check if we should retry
          if (retryCount < MAX_RETRIES && 
              (error.code === 'unavailable' || 
               error.code === 'network-request-failed' ||
               error.message?.includes('network error'))) {
            retryCount++;
            console.log(`Network error, retry ${retryCount}/${MAX_RETRIES} in 1 second...`);
            setFirebaseError(`Retry ${retryCount}/${MAX_RETRIES}: Network error`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptFetch(); // Recursively retry
          }
          
          setFirebaseError('Could not fetch cat data: ' + error.message);
          setCatMarkers(sampleCatMarkers); // Fallback to sample data
        } finally {
          if (retryCount === MAX_RETRIES) {
            console.warn(`Max retries (${MAX_RETRIES}) reached for fetching cat posts.`);
          }
          setLoadingCats(false);
        }
      } catch (error) {
        console.error('Error setting up cat posts fetch:', error);
        setFirebaseError('Setup error: ' + error.message);
        setCatMarkers(sampleCatMarkers); // Fallback to sample data
        setLoadingCats(false);
      }
    };
    
    // Start the fetch attempt
    await attemptFetch();
    console.log('fetchCatMarkers completed');
  }, []); // Memoize with empty dependency array

  // Fetch user location
  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setIsLoading(false);
          Alert.alert(
            'Location Permission Denied',
            'Please enable location services to see your position on the map.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setLocation(currentLocation);
        
        // Update map region to user's location
        setMapRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Failed to get location: ' + error.message);
        Alert.alert(
          'Location Error',
          'Unable to determine your location. Using default location instead.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Fetch cat markers on component mount
  useEffect(() => {
    // Call fetch function
    fetchCatMarkers();
    
    // Clean up on unmount - no cleanup needed here
    return () => { /* cleanup */ };
  }, []);
  
  // Refresh cat markers when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('MapScreen in focus, refreshing cat markers');
      fetchCatMarkers();
      // Proper empty function return for cleanup
      return () => { /* cleanup */ };
    }, [])
  );
  
  // Set up network monitoring and diagnostics
  useEffect(() => {
    // Generate initial diagnostic report
    generateDiagnosticReport().then(report => {
      console.log('Initial diagnostic report completed');
      
      // Update online status based on report
      if (typeof report.network.isConnected === 'boolean') {
        setIsOnline(report.network.isConnected);
      }
    });
    
    // Start monitoring network status
    const unsubscribe = startNetworkMonitoring(status => {
      setIsOnline(status.isConnected);
      
      // If coming back online, refresh cat markers
      if (status.isConnected) {
        fetchCatMarkers();
      }
    });
    
    return () => {
      // Clean up network monitoring on unmount
      unsubscribe();
    };
  }, []);
  
  /**
   * Recenters the map to the user's current location
   * - Requests location permissions if needed
   * - Fetches current location if not already available
   * - Updates map region to center on user's coordinates
   * - Maintains current zoom level when recentering
   * - Handles errors with appropriate user feedback
   */
  const recenterToUserLocation = async () => {
    // If zoom operation is in progress, don't recenter
    if (isZooming) return;
    
    // Show loading indicator
    setRecenterLoading(true);
    
    try {
      if (!location) {
        // Check if we have permission
        const { status } = await Location.getForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'Please enable location services to recenter the map.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        // Store location for future use
        setLocation(currentLocation);
        
        // Use current location coordinates
        const newRegion = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          // Keep current zoom level for consistency
          latitudeDelta: mapRegion.latitudeDelta,
          longitudeDelta: mapRegion.longitudeDelta,
        };
        
        // Update state and animate map
        setMapRegion(newRegion);
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 500);
        }
      } else {
        // We already have the location, just recenter while preserving zoom
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          // Preserve current zoom level
          latitudeDelta: mapRegion.latitudeDelta,
          longitudeDelta: mapRegion.longitudeDelta,
        };
        
        // Update state and animate map
        setMapRegion(newRegion);
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 500);
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Provide user feedback
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      // Hide loading indicator
      setRecenterLoading(false);
    }
  };
  
  /**
   * Zooms in the map by decreasing the delta values
   * - Maintains the current center point
   * - Prevents concurrent zoom operations
   * - Updates the map region state
   * - Animates the transition smoothly
   */
  const zoomIn = () => {
    if (isZooming) return; // Prevent rapid zooming that could lead to inconsistent state
    
    setIsZooming(true);
    
    // Calculate new zoom level (smaller delta = more zoomed in)
    // Limit minimum zoom to prevent excessive zooming
    const minDelta = 0.001; // Minimum delta value to prevent over-zooming
    const newLatDelta = Math.max(mapRegion.latitudeDelta / ZOOM_FACTOR, minDelta);
    const newLongDelta = Math.max(mapRegion.longitudeDelta / ZOOM_FACTOR, minDelta);
    
    // Create a new region with smaller delta values (zoom in)
    const newRegion = {
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
      latitudeDelta: newLatDelta,
      longitudeDelta: newLongDelta,
    };
    
    // Update state
    setMapRegion(newRegion);
    
    // Animate to the new region
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, ANIMATION_DURATION);
    }
    
    // Reset zooming state after animation completes
    setTimeout(() => {
      setIsZooming(false);
    }, ANIMATION_DURATION);
  };
  
  /**
   * Zooms out the map by increasing the delta values
   * - Maintains the current center point
   * - Prevents concurrent zoom operations
   * - Updates the map region state
   * - Animates the transition smoothly
   */
  const zoomOut = () => {
    if (isZooming) return; // Prevent rapid zooming that could lead to inconsistent state
    
    setIsZooming(true);
    
    // Calculate new zoom level (larger delta = more zoomed out)
    // Limit maximum zoom to prevent excessive zooming out
    const maxDelta = 60; // Maximum delta value to prevent extreme zoom out
    const newLatDelta = Math.min(mapRegion.latitudeDelta * ZOOM_FACTOR, maxDelta);
    const newLongDelta = Math.min(mapRegion.longitudeDelta * ZOOM_FACTOR, maxDelta);
    
    // Create a new region with larger delta values (zoom out)
    const newRegion = {
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
      latitudeDelta: newLatDelta,
      longitudeDelta: newLongDelta,
    };
    
    // Update state
    setMapRegion(newRegion);
    
    // Animate to the new region
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, ANIMATION_DURATION);
    }
    
    // Reset zooming state after animation completes
    setTimeout(() => {
      setIsZooming(false);
    }, ANIMATION_DURATION);
  };
  
  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Cat Map</ThemedText>
        <ThemedText style={styles.message}>
          Maps are currently only available on mobile devices.
        </ThemedText>
      </ThemedView>
    );
  }

  // Show loading indicator while getting location
  if (isLoading && loadingCats) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <ThemedText style={styles.message}>Loading map and cat data...</ThemedText>
      </ThemedView>
    );
  }

  // Show error message for location
  const userLocationDisplay = errorMsg ? (
    <ThemedView style={styles.errorContainer}>
      <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
    </ThemedView>
  ) : null;

  // Show Firebase error if any
  const firebaseErrorDisplay = firebaseError ? (
    <ThemedView style={styles.warningContainer}>
      <ThemedText style={styles.warningText}>
        {firebaseError}. {catMarkers === sampleCatMarkers ? 'Using sample data.' : ''}
      </ThemedText>
    </ThemedView>
  ) : null;

  // Show loading indicator for cats if location is ready but cats are still loading
  const catsLoadingDisplay = !isLoading && loadingCats ? (
    <ThemedView style={[styles.loadingContainer, { bottom: 90 }]}>
      <ActivityIndicator size="small" color="#0000ff" />
      <ThemedText style={styles.loadingText}>Loading cat sightings...</ThemedText>
    </ThemedView>
  ) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Firestore connection status indicator */}
      <FirestoreStatusBar onRetry={() => fetchCatMarkers()} />
      
      <View style={styles.mapContainer}>
        <MapView 
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          provider={PROVIDER_DEFAULT}
          showsUserLocation={true}
          showsMyLocationButton={false} // Disable default button since we're adding our own
        >
          {/* Display marker at the current location or default location */}
          <Marker
            coordinate={{
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
            }}
            title={location ? "Your Location" : "Default Location"}
            description={location ? "You are here" : "San Francisco (default location)"}
            pinColor="blue"
          />
          
          {/* Render cat markers from Firestore data with circular thumbnails */}
          {catMarkers.map(marker => (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: Number(marker.latitude),
                longitude: Number(marker.longitude),
              }}
              title={marker.title || 'Cat Sighting'}
              description={marker.caption || 'Check out this cat!'}
              tracksViewChanges={false}
              onPress={() => {
                // When marker is pressed, navigate to cat profile page with data
                console.log('Marker pressed, navigating to cat profile:', marker.id);
                
                // Navigate to cat profile screen with cat data
                // Using Expo Router navigation
                router.push({
                  pathname: '/cat-profile', // Updated path to root-level screen
                  params: { 
                    // Pass both ID and stringified data for flexibility
                    catId: marker.id,
                    catData: JSON.stringify(marker)
                  }
                });
              }}
            >
              {/* Custom marker with circular cat photo thumbnail */}
              <View style={styles.markerContainer}>
                {/* Display cat thumbnail with proper error handling */}
                <Image 
                  source={{ uri: marker.imageUrl }} 
                  style={styles.markerImage}
                  // Handle loading and errors
                  onError={() => console.warn(`Failed to load image for marker ${marker.id}`)}
                />
              </View>
            </Marker>
          ))}
        </MapView>
      </View>

      {/* Map Controls Container - vertical stack in top right */}
      <View style={styles.controlsContainer}>
        {/* Recenter Button at top */}
        <TouchableOpacity
          style={styles.mapButton}
          onPress={recenterToUserLocation}
          disabled={recenterLoading}
          activeOpacity={0.7}
        >
          {recenterLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="locate" size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
        
        {/* Zoom In Button */}
        <TouchableOpacity
          style={styles.mapButton}
          onPress={zoomIn}
          activeOpacity={0.7}
          disabled={isZooming}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        {/* Zoom Out Button */}
        <TouchableOpacity
          style={styles.mapButton}
          onPress={zoomOut}
          activeOpacity={0.7}
          disabled={isZooming}
        >
          <Ionicons name="remove" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      {/* Floating Action Button for adding a new cat photo */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/camera-upload')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Add a cat photo"
        accessibilityHint="Opens camera to take or select a photo of a cat"
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
      
      {userLocationDisplay}
      {firebaseErrorDisplay}
      {catsLoadingDisplay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative', // Important for absolute positioning of children
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject, // Fill the entire container
  },
  map: {
    ...StyleSheet.absoluteFillObject, // Fill the entire container
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
  },
  warningContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 165, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  warningText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 14,
  },
  // Container for all map controls
  controlsContainer: {
    position: 'absolute',
    top: 40, // Positioned higher on the screen
    right: 10,
    flexDirection: 'column', // Stack controls vertically
    alignItems: 'center',
    zIndex: 9999,
  },
  
  // Unified map button style (used for all three buttons)
  mapButton: {
    width: 48,
    height: 48,
    borderRadius: 8, // Rounded corners
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Black with partial opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8, // Spacing between buttons
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    // Elevation for Android
    elevation: 4,
  },
  
  // Floating Action Button for adding new cat photos
  fab: {
    position: 'absolute',
    bottom: 110, // Moved up from 30 to 110
    right: 30,
    backgroundColor: '#757575', // Gray color as requested
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },

  // Custom marker styles for cat thumbnails
  markerContainer: {
    width: 45,
    height: 45,
    borderRadius: 23, // Half of width/height for perfect circle
    overflow: 'hidden', // Ensures the image doesn't overflow the circular container
    borderWidth: 2.5,
    borderColor: '#fff', // White border around the circular image
    backgroundColor: '#f0f0f0', // Light background for images that are loading
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000', // Add shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 6, // Android shadow
  },
  markerImage: {
    width: '100%',
    height: '100%',
  },
});
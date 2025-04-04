import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
  Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

// Get screen dimensions for responsive sizing
const { width, height } = Dimensions.get('window');

/**
 * CatProfileScreen - Displays detailed information about a cat post
 * Receives cat post data via navigation parameters
 */
export default function CatProfileScreen() {
  // Get params from navigation
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // State for cat data and loading
  const [catData, setCatData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Memoize the params to prevent infinite loop
  const memoizedCatId = React.useMemo(() => params.catId, []);
  const memoizedCatData = React.useMemo(() => params.catData, []);
  
  // Get the data either from params or fetch from Firestore (only once)
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    
    const loadCatData = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoading(true);
        console.log('CatProfileScreen - Loading data with params:', { 
          hasCatData: !!memoizedCatData, 
          hasCatId: !!memoizedCatId 
        });
        
        // Ensure we have either catData or catId parameter
        if (!memoizedCatData && !memoizedCatId) {
          setError('No cat data or ID provided. This page should only be accessed by clicking on a cat marker.');
          setIsLoading(false);
          return;
        }
        
        // If we received the full cat data object through params
        if (memoizedCatData) {
          try {
            // If the data is a string (it was stringified for navigation), parse it
            const data = typeof memoizedCatData === 'string'
              ? JSON.parse(memoizedCatData)
              : memoizedCatData;
              
            console.log('Successfully parsed cat data:', data.id);
            if (isMounted) {
              setCatData(data);
            }
            return;
          } catch (err) {
            console.error('Error parsing cat data:', err);
            // Fall through to fetch from Firestore
          }
        }
        
        // If we only received the ID, fetch from Firestore
        if (memoizedCatId) {
          console.log('Fetching cat data from Firestore with ID:', memoizedCatId);
          const docRef = doc(firestore, 'catPosts', memoizedCatId.toString());
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && isMounted) {
            const data = { id: docSnap.id, ...docSnap.data() };
            console.log('Successfully fetched cat data from Firestore:', docSnap.id);
            setCatData(data);
          } else if (isMounted) {
            console.error('Cat post not found in Firestore:', memoizedCatId);
            setError('Cat post not found. It may have been deleted.');
          }
        } else if (isMounted) {
          setError('No cat ID provided. This page should only be accessed by clicking on a cat marker.');
        }
      } catch (err) {
        console.error('Error loading cat data:', err);
        if (isMounted) {
          setError('Failed to load cat details. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadCatData();
    
    // Cleanup function to handle unmounting
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once
  
  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      let date;
      
      // Handle Firebase timestamp or ISO string
      if (timestamp.toDate) {
        // Firebase Timestamp
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        // Firebase Timestamp in seconds
        date = new Date(timestamp.seconds * 1000);
      } else {
        // ISO string or other format
        date = new Date(timestamp);
      }
      
      return format(date, 'PPP p'); // Format: Oct 1, 2023, 12:30 PM
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };
  
  // Show loading indicator
  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={styles.loadingText}>Loading cat details...</ThemedText>
      </ThemedView>
    );
  }
  
  // Show error message
  if (error || !catData) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#F44336" />
        <ThemedText style={styles.errorText}>{error || 'Failed to load cat details'}</ThemedText>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backButtonText}>Return to Map</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  // Swipe-down hint UI
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // Animate the opacity of the swipe indicator based on scroll position
  const swipeIndicatorOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  
  // Render cat profile
  return (
    <View style={styles.mainContainer}>
      {/* Swipe down indicator */}
      <Animated.View style={[styles.swipeIndicator, { opacity: swipeIndicatorOpacity }]}>
        <View style={styles.swipeBar} />
        <ThemedText style={styles.swipeText}>Swipe down to dismiss</ThemedText>
      </Animated.View>
      
      <Animated.ScrollView 
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16} // For smooth animation
      >
        <ThemedView style={styles.container}>
        {/* Cat Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: catData.imageUrl }}
            style={styles.catImage}
            resizeMode="cover"
          />
        </View>
        
        {/* Cat Info */}
        <View style={styles.infoContainer}>
          <ThemedText style={styles.title}>{catData.title}</ThemedText>
          
          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <ThemedText style={styles.locationText}>
              {catData.latitude.toFixed(6)}, {catData.longitude.toFixed(6)}
            </ThemedText>
          </View>
          
          {/* Date */}
          <View style={styles.metaRow}>
            <Ionicons name="calendar" size={18} color="#757575" />
            <ThemedText style={styles.metaText}>
              {formatDate(catData.createdAt)}
            </ThemedText>
          </View>
          
          {/* Caption */}
          {catData.caption && (
            <View style={styles.captionContainer}>
              <ThemedText style={styles.captionTitle}>Caption</ThemedText>
              <ThemedText style={styles.captionText}>{catData.caption}</ThemedText>
            </View>
          )}
          
          {/* Tags */}
          {catData.tags && catData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <ThemedText style={styles.sectionTitle}>Tags</ThemedText>
              <View style={styles.tagsList}>
                {catData.tags.map((tag, index) => (
                  <View key={index} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Hashtags */}
          {catData.hashtags && catData.hashtags.length > 0 && (
            <View style={styles.hashtagsContainer}>
              <ThemedText style={styles.sectionTitle}>Hashtags</ThemedText>
              <View style={styles.tagsList}>
                {catData.hashtags.map((hashtag, index) => (
                  <View key={index} style={styles.hashtagChip}>
                    <Text style={styles.hashtagText}>{hashtag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ThemedView>
    </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  swipeBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 4,
  },
  swipeText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    fontWeight: '500',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24, // Add padding to accommodate the swipe indicator
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: width * 0.8, // Image height proportional to screen width
    borderBottomLeftRadius: 16, 
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  catImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    width: '100%',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 6,
    color: '#757575',
  },
  captionContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  captionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  captionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagsContainer: {
    marginBottom: 16,
  },
  hashtagsContainer: {
    marginBottom: 24,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#1976D2',
    fontSize: 14,
  },
  hashtagChip: {
    backgroundColor: '#DCEDC8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  hashtagText: {
    color: '#558B2F',
    fontSize: 14,
  },
});
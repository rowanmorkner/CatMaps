import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { firestore, storage } from '@/src/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { addDocumentWithRetry, isFirestoreAvailable } from '@/src/utils/firestoreHelpers';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { useRouter } from 'expo-router';

const CameraUploadScreen = () => {
  const router = useRouter();
  // State for image and camera
  const [image, setImage] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef(null);

  // State for metadata
  const [location, setLocation] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [tags, setTags] = useState('');

  // Function to get current location
  const getCurrentLocation = async () => {
    console.log('getCurrentLocation called');
    
    if (!locationPermission) {
      console.log('Location permission not granted, requesting permission');
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      console.log('Permission request result:', locationStatus.status);
      setLocationPermission(locationStatus.status === 'granted');
      
      if (locationStatus.status !== 'granted') {
        console.log('Permission denied');
        Alert.alert('Location Permission Required', 'Please enable location services to use this feature.');
        return;
      }
    }
    
    try {
      console.log('Getting current location...');
      setIsLoading(true);
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });
      console.log('Current location received:', currentLocation);
      setLocation(currentLocation);
      Alert.alert('Success', 'Your current location has been set!');
    } catch (error) {
      console.error('Error getting location:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Location Error', 'Unable to retrieve your current location. Please ensure location services are enabled.');
    } finally {
      console.log('Finished getting location, setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      // Request camera permissions
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(cameraStatus.status === 'granted');
      
      // Request media library permissions
      const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setMediaLibraryPermission(mediaLibraryStatus.status === 'granted');
      
      // Request location permissions
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationStatus.status === 'granted');
      
      if (locationStatus.status === 'granted') {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest
          });
          setLocation(currentLocation);
        } catch (error) {
          console.error('Error getting location:', error);
          Alert.alert('Location Error', 'Unable to retrieve your current location. Please ensure location services are enabled.');
        }
      }
    })();
  }, []);
  
  // Open camera
  const openCamera = () => {
    if (cameraPermission) {
      setShowCamera(true);
    } else {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
    }
  };
  
  // Take picture
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setImage(photo.uri);
        setShowCamera(false);
        
        // Update location when picture is taken
        if (locationPermission) {
          try {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Highest
            });
            setLocation(currentLocation);
          } catch (error) {
            console.error('Error getting location:', error);
          }
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Camera Error', 'Failed to take picture. Please try again.');
      }
    }
  };
  
  // Pick image from library
  const pickImage = async () => {
    if (mediaLibraryPermission) {
      try {
        // Using compatible options for Expo Image Picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use the older API that's compatible
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          exif: true, // Include EXIF data
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedAsset = result.assets[0];
          setImage(selectedAsset.uri);
          
          // Try to extract location from EXIF if available
          if (selectedAsset.exif && selectedAsset.exif.GPSLatitude && selectedAsset.exif.GPSLongitude) {
            setLocation({
              coords: {
                latitude: selectedAsset.exif.GPSLatitude,
                longitude: selectedAsset.exif.GPSLongitude,
                altitude: selectedAsset.exif.GPSAltitude || 0,
                accuracy: 0,
                altitudeAccuracy: 0,
                heading: 0,
                speed: 0
              },
              timestamp: Date.now()
            });
          } else if (locationPermission) {
            // If no EXIF data, get current location
            try {
              const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
              });
              setLocation(currentLocation);
            } catch (error) {
              console.error('Error getting location:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error picking image:', error);
        Alert.alert('Gallery Error', 'Failed to select image. Please try again.');
      }
    } else {
      Alert.alert('Permission Required', 'Media library permission is required to select photos.');
    }
  };
  
  // Development mode - whether to skip Firebase Storage upload
  const DEV_MODE = true; // Set to true for debugging, false for production
  
  // Upload image and data
  const uploadCatPhoto = async () => {
    console.log('Starting uploadCatPhoto function');
    
    if (!image) {
      console.log('No image selected, showing alert');
      Alert.alert('Image Required', 'Please take or select a photo first.');
      return;
    }
    
    if (!title.trim()) {
      console.log('No title provided, showing alert');
      Alert.alert('Title Required', 'Please provide a title for your cat photo.');
      return;
    }
    
    console.log('Validation passed, setting isLoading to true');
    setIsLoading(true);
    
    // Disable button immediately to avoid double taps
    Keyboard.dismiss();
    
    try {
      let imageUrl = '';
      
      console.log('DEV_MODE setting:', DEV_MODE);
      console.log('Location data:', location);
      
      if (!DEV_MODE) {
        // Only attempt Firebase upload in production mode
        console.log('Production mode: Starting Firebase Storage upload');
        
        // 1. Upload image to Firebase Storage
        console.log('Fetching image from URI:', image);
        const response = await fetch(image);
        console.log('Converting image to blob');
        const blob = await response.blob();
        console.log('Blob size:', blob.size);
        
        const filename = image.substring(image.lastIndexOf('/') + 1);
        console.log('Generated filename:', filename);
        
        const storageRef = ref(storage, `images/cats/${Date.now()}_${filename}`);
        console.log('Storage reference created');
        
        console.log('Uploading blob to Firebase Storage');
        await uploadBytes(storageRef, blob);
        console.log('Upload complete, getting download URL');
        
        imageUrl = await getDownloadURL(storageRef);
        console.log('Download URL obtained:', imageUrl);
      } else {
        // In development mode, just use the local URI
        console.log('Development mode: Using local image URI');
        imageUrl = image;
      }
      
      // 2. Prepare cat data
      console.log('Preparing cat data object');
      const catData = {
        // Basic information
        title,
        caption: caption.trim(),
        hashtags: hashtags.trim().split(',').map(tag => tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`).filter(tag => tag),
        tags: tags.trim().split(',').map(tag => tag.trim()).filter(tag => tag),
        
        // Image URL (for map thumbnails and detail view)
        imageUrl: imageUrl,
        
        // Geographic coordinates (required for map pins)
        latitude: location?.coords.latitude || null,
        longitude: location?.coords.longitude || null,
        
        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('Cat data prepared:', JSON.stringify(catData, null, 2));
      
      // Check Firestore availability first
      const isAvailable = await isFirestoreAvailable();
      console.log('Firestore availability check:', isAvailable);

      try {
        // Try to add document with retry logic
        console.log('Saving cat data to Firestore with retry logic');
        
        if (!DEV_MODE) {
          // Use server timestamp in production mode
          const docRef = await addDocumentWithRetry('catPosts', catData, true);
          console.log('Document saved to Firestore with ID:', docRef.id);
        } else {
          // In development mode, use local timestamp but still use retry logic
          console.log('DEV MODE: Saving to Firestore with local timestamp');
          const docRef = await addDocumentWithRetry('catPosts', catData, false);
          console.log('DEV MODE: Cat photo data saved to Firestore with ID:', docRef.id);
        }
      } catch (error) {
        console.error('Failed to save to Firestore after multiple attempts:', error);
        
        if (DEV_MODE) {
          // In dev mode, just log the error but don't show to user
          console.warn('DEV MODE: Using fallback local storage approach');
        } else {
          // In production, we need to tell the user something went wrong
          throw error; // This will be caught by the outer try-catch
        }
      }
      
      console.log('Upload process completed successfully');
      // Clear loading state BEFORE showing alert
      setIsLoading(false);
      console.log('Setting isLoading to false');
      
      // Use setTimeout to ensure state update has completed before showing alert
      setTimeout(() => {
        console.log('Showing success alert');
        Alert.alert(
          'Success', 
          DEV_MODE ? 'Cat photo processed successfully (Dev Mode)' : 'Your cat photo has been uploaded!',
          [{ 
            text: 'OK', 
            onPress: () => {
              console.log('OK pressed, navigating back to map screen');
              // Use setTimeout to ensure the alert is fully dismissed before navigation
              setTimeout(() => {
                console.log('Executing navigation');
                router.back();
              }, 300);
            }
          }]
        );
      }, 300);
      
    } catch (error) {
      console.error('Error processing cat photo:', error);
      console.error('Error stack:', error.stack);
      Alert.alert(
        'Process Error', 
        'Failed to process photo. Error: ' + (error.message || 'Unknown error')
      );
    } finally {
      console.log('In finally block - ensuring isLoading is false');
      // Important: Only set loading false here for error cases
      // Success case already handles this before the alert
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };
  
  // If showing camera view
  if (showCamera) {
    return (
      <View style={styles.container}>
        <Camera 
          style={styles.camera} 
          ref={cameraRef}
          type={CameraType.back}
        >
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={() => setShowCamera(false)}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={takePicture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            
            <View style={styles.cameraButtonPlaceholder} />
          </View>
        </Camera>
      </View>
    );
  }
  
  // Main upload form
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedText style={styles.header}>Upload Cat Photo</ThemedText>
          
          {/* Image Preview */}
          <View style={styles.imageContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image" size={80} color="#cccccc" />
                <ThemedText style={styles.placeholderText}>No image selected</ThemedText>
              </View>
            )}
          </View>
          
          {/* Image Selection Options */}
          <View style={styles.imageOptions}>
            <TouchableOpacity 
              style={[styles.optionButton, styles.cameraOption]}
              onPress={openCamera}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, styles.galleryOption]}
              onPress={pickImage}
            >
              <Ionicons name="images" size={24} color="white" />
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
          
          {/* Location Information */}
          <View style={styles.locationContainer}>
            <View style={styles.locationHeader}>
              <ThemedText style={styles.locationTitle}>Location</ThemedText>
              <TouchableOpacity 
                style={styles.myLocationButton}
                onPress={getCurrentLocation}
                disabled={isLoading}
              >
                <Ionicons name="location" size={16} color="white" />
                <Text style={styles.myLocationText}>My Location</Text>
              </TouchableOpacity>
            </View>
            {location ? (
              <ThemedText style={styles.locationText}>
                {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
              </ThemedText>
            ) : (
              <ThemedText style={styles.locationMissing}>
                Location data unavailable
              </ThemedText>
            )}
          </View>
          
          {/* Metadata Form */}
          <View style={styles.form}>
            <ThemedText style={styles.label}>Title *</ThemedText>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Give your cat a name"
              placeholderTextColor="#999"
            />
            
            <ThemedText style={styles.label}>Caption</ThemedText>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={caption}
              onChangeText={setCaption}
              placeholder="Tell us about this cat"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
            
            <ThemedText style={styles.label}>Hashtags</ThemedText>
            <TextInput
              style={styles.input}
              value={hashtags}
              onChangeText={setHashtags}
              placeholder="#cute, #catlife, #catsoftheworld"
              placeholderTextColor="#999"
            />
            
            <ThemedText style={styles.label}>Tags</ThemedText>
            <View style={styles.tagsContainer}>
              {/* Predefined tag options as selectable chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScrollView}>
                {[
                  "Stray", "Indoor", "Window Cat", "Friendly", "Shy", 
                  "Tabby", "Ginger", "Black", "White", "Calico", "Tuxedo"
                ].map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      tags.includes(tag) && styles.tagChipSelected
                    ]}
                    onPress={() => {
                      // Toggle tag selection
                      const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
                      if (currentTags.includes(tag)) {
                        // Remove tag if already selected
                        setTags(currentTags.filter(t => t !== tag).join(', '));
                      } else {
                        // Add tag if not selected
                        setTags(currentTags.length > 0 ? `${currentTags.join(', ')}, ${tag}` : tag);
                      }
                    }}
                  >
                    <Text style={[
                      styles.tagChipText,
                      tags.includes(tag) && styles.tagChipTextSelected
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Allow custom tags input */}
              <TextInput
                style={[styles.input, styles.tagsInput]}
                value={tags}
                onChangeText={setTags}
                placeholder="Or enter custom tags (comma separated)"
                placeholderTextColor="#999"
              />
            </View>
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={uploadCatPhoto}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text style={[styles.submitText, {marginLeft: 10}]}>Uploading...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="white" />
                <Text style={styles.submitText}>Upload Cat</Text>
              </>
            )}
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  tagsContainer: {
    marginBottom: 15,
  },
  tagScrollView: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  tagChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tagChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  tagChipText: {
    fontSize: 14,
    color: '#666',
  },
  tagChipTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  tagsInput: {
    marginTop: 5,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#888',
  },
  imageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  cameraOption: {
    backgroundColor: '#4CAF50',
  },
  galleryOption: {
    backgroundColor: '#2196F3',
  },
  optionText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  locationContainer: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 20,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontWeight: 'bold',
  },
  myLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  myLocationText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  locationText: {
    fontSize: 14,
  },
  locationMissing: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#999',
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 56, // Fixed height to prevent layout shift during loading
  },
  submitText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 30,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButtonPlaceholder: {
    width: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
});

export default CameraUploadScreen;
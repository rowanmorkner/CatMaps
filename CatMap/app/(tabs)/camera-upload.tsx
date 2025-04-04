import CameraUploadScreen from '@/src/screens/CameraUploadScreen';
import { Stack } from 'expo-router';

export default function CameraUploadPage() {
  return (
    <>
      <Stack.Screen options={{ 
        title: 'Upload Cat Photo',
        headerShown: true,
        presentation: 'modal',  // Swipeable modal
        animation: 'slide_from_bottom',  // Animation from bottom
        gestureEnabled: true,  // Enable swipe gestures
        gestureResponseDistance: 80,  // Increase swipe response distance
      }} />
      <CameraUploadScreen />
    </>
  );
}
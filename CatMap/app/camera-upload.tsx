import { Redirect } from 'expo-router';

/**
 * This file exists to redirect users who try to directly access
 * the camera upload screen without going through the map.
 * 
 * Access to camera upload should only happen via the Map screen's FAB button.
 */
export default function CameraUploadDirectAccessPage() {
  // Redirect to explore page if someone tries to access this directly
  return <Redirect href="/(tabs)/explore" />;
}
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZo89tAhJSWP8W7vmoLUH45Y9B7zHhKmI",
  authDomain: "catmaps-13217.firebaseapp.com",
  projectId: "catmaps-13217",
  storageBucket: "catmaps-13217.firebasestorage.app",
  messagingSenderId: "752389114504",
  appId: "1:752389114504:web:d3f1fa9543f3dd2c0d6d3d"
};

// Platform specific Firebase initialization
let app, auth, firestore, storage;

if (Platform.OS === 'web') {
  // Import Firebase web modules
  const { initializeApp: initializeWebApp } = require('firebase/app');
  const { getAuth } = require('firebase/auth');
  const { getFirestore } = require('firebase/firestore');
  const { getStorage } = require('firebase/storage');
  
  // Initialize Firebase for web
  const webApp = initializeWebApp(firebaseConfig);
  app = webApp;
  auth = getAuth;
  firestore = getFirestore;
  storage = getStorage;
} else {
  // Import React Native Firebase modules
  const { initializeApp } = require('@react-native-firebase/app');
  const reactNativeAuth = require('@react-native-firebase/auth');
  const reactNativeFirestore = require('@react-native-firebase/firestore');
  const reactNativeStorage = require('@react-native-firebase/storage');
  
  // Initialize Firebase for React Native
  app = initializeApp(firebaseConfig);
  auth = reactNativeAuth;
  firestore = reactNativeFirestore;
  storage = reactNativeStorage;
}

export { app, auth, firestore, storage };
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBiMfPs-wBF7gadZPNOWu5Bxq9Uxh7SyPU",
  authDomain: "linkmanager-6b8fa.firebaseapp.com",
  projectId: "linkmanager-6b8fa",
  storageBucket: "linkmanager-6b8fa.appspot.com",
  messagingSenderId: "1068294389128",
  appId: "1:1068294389128:ios:65ec90a6017b9c59750e3d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth - different for web vs native
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

// Initialize Firestore
const db = getFirestore(app);

export { app, db };


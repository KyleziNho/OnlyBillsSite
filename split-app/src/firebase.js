import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyByDh_nxkV1kWGdIHFldDAoIU7iGqU3FQc",
  authDomain: "onlybills-b8dac.firebaseapp.com",
  projectId: "onlybills-b8dac",
  storageBucket: "onlybills-b8dac.firebasestorage.app",
  messagingSenderId: "572680746912",
  appId: "1:572680746912:web:9c3890b712bdc19a9a16c5"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

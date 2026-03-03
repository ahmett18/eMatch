import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAW921oL1KTEk5n75xWvfGWM4Ab1SKnpbg",
  authDomain: "ematch-bb818.firebaseapp.com",
  projectId: "ematch-bb818",
  storageBucket: "ematch-bb818.firebasestorage.app",
  messagingSenderId: "955647946180",
  appId: "1:955647946180:web:c66947044f0dd6f633c891"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

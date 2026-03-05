import { db } from "./firebase.js";
import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

export async function createUserDocument(uid, data) {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { ...data, balance: data.balance || 0, createdAt: serverTimestamp() }, { merge: true });
}

export async function getUserProfile(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() : null;
}

export async function updateUserBalance(uid, amount) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { balance: increment(amount), updatedAt: serverTimestamp() });
}

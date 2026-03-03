import { auth } from "./firebase.js";
import { createUserDocument } from "./db.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

export async function signUpWithEmail(email, password, displayName) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserDocument(userCredential.user.uid, { email, displayName: displayName || "Gamer", balance: 100 });
        return { success: true, user: userCredential.user };
    } catch (error) { return { success: false, error: error.message }; }
}

export async function signInWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) { return { success: false, error: error.message }; }
}

export async function signOutUser() { await signOut(auth); }
export function onAuthChange(callback) { return onAuthStateChanged(auth, callback); }

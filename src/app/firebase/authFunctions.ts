import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";

// Google Sign-In
export const signInWithGoogle = async (router: any) => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Google User:", result.user);
    router.push("/profile"); // Redirect to the profile page
  } catch (error) {
    console.error("Google Sign-In Error:", error);
  }
};

// Sign Out
export const logOut = async () => {
  try {
    await signOut(auth);
    console.log("User signed out.");
  } catch (error) {
    console.error("Sign-Out Error:", error);
  }
};

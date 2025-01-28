import { GoogleAuthProvider, signInWithPopup, signOut, AuthError } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { createUserProfile } from "./firestoreOperations";
import toast from 'react-hot-toast';

interface NavigationRouter {
  push: (href: string, options?: { scroll?: boolean }) => void;
}

// Google Sign-In
export const signInWithGoogle = async (router: NavigationRouter) => {
  const provider = new GoogleAuthProvider();
  try {
    console.log("Starting Google Sign-In process...");
    const result = await signInWithPopup(auth, provider);
    console.log("Google Sign-In successful:", result.user.email);
    
    console.log("Creating/updating user profile...");
    await createUserProfile(result.user);
    console.log("User profile created/updated successfully");
    
    toast.success('Successfully signed in!');
    router.push("/profile");
  } catch (error: unknown) {
    console.error("Detailed Google Sign-In Error:", {
      code: (error as AuthError).code,
      message: (error as Error).message,
      details: error
    });

    // User-friendly error messages
    let errorMessage = 'Failed to sign in. Please try again.';
    if ((error as AuthError).code === 'auth/unauthorized-domain') {
      errorMessage = 'This domain is not authorized for sign-in. Please contact support.';
    } else if ((error as AuthError).code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in was cancelled. Please try again.';
    } else if ((error as AuthError).code === 'auth/popup-blocked') {
      errorMessage = 'Sign-in popup was blocked. Please allow popups for this site.';
    }

    toast.error(errorMessage);
  }
};

// Sign Out
export const logOut = async () => {
  try {
    console.log("Starting sign out process...");
    await signOut(auth);
    console.log("User signed out successfully");
    toast.success('Successfully signed out!');
  } catch (error) {
    console.error("Sign-Out Error:", error);
    toast.error('Failed to sign out. Please try again.');
  }
};

import { GoogleAuthProvider, signInWithPopup, signOut, AuthError } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { createUserProfile } from "./firestoreOperations";
import toast from 'react-hot-toast';
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { trackEvent } from "@/utils/analytics";

// Google Sign-In
export const signInWithGoogle = async (router: AppRouterInstance) => {
  const provider = new GoogleAuthProvider();
  try {
    console.log("Starting Google Sign-In process...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document already exists
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (!userDoc.exists()) {
      // Create new user document with initial data
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        joinedAt: serverTimestamp(), // Add join timestamp
        showInMembers: true,
        isApproved: false,
        isAdmin: false,
        linkedinUrl: '',
        status: {
          lookingForCofounder: false,
          needsProjectHelp: false,
          offeringProjectHelp: false,
          isHiring: false,
          seekingJob: false,
          openToNetworking: false,
        }
      });
      toast.success('Welcome to YAMLRG!');
    }

    console.log("Creating/updating user profile...");
    await createUserProfile(user);
    console.log("User profile created/updated successfully");
    
    toast.success('Successfully signed in!');
    router.push("/"); // Redirect to home page after successful sign in

    trackEvent('login', {
      method: 'google',
      new_user: !userDoc.exists()
    });
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

    trackEvent('login_error', {
      error_code: (error as AuthError).code,
      error_message: (error as Error).message
    });
  }
};

// Sign Out
export const logOut = async () => {
  try {
    console.log("Starting sign out process...");
    await signOut(auth);
    console.log("User signed out successfully");
    toast.success('Successfully signed out!');

    trackEvent('logout');
  } catch (error) {
    console.error("Sign-Out Error:", error);
    toast.error('Failed to sign out. Please try again.');
  }
};

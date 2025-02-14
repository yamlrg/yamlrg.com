import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import toast from 'react-hot-toast';
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { trackEvent } from "@/utils/analytics";
import { handleFirstLogin, getUserProfile } from "./firestoreOperations";

// Initialize provider outside the function to avoid recreation
const provider = new GoogleAuthProvider();

// Google Sign-In
export const signInWithGoogle = async (router: AppRouterInstance) => {
  try {
    console.log('Starting Google Sign-In process...');
    const result = await signInWithPopup(auth, provider);
    
    if (result.user) {
      // First check if user has a profile
      const profile = await getUserProfile(result.user.uid);
      
      if (!profile) {
        // No profile exists, try to create one
        await handleFirstLogin(result.user);
        
        // Check again for profile
        const newProfile = await getUserProfile(result.user.uid);
        if (!newProfile) {
          // Still no profile, sign out and show error
          await auth.signOut();
          toast.error('No approved join request found. Please request to join first.');
          return;
        }
      }

      // If we get here, we have a valid profile
      router.replace('/members');
    }
    
    return result;
  } catch (error) {
    console.error('Sign-In Error:', error);
    trackEvent('login_error', {
      error_message: error.message
    });
    throw error;
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

export const setAdminClaim = async (email: string) => {
  try {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error setting admin claim:', error);
    return false;
  }
};

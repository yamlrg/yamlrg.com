import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { trackEvent } from "@/utils/analytics";
import { handleFirstLogin } from "./firestoreOperations";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// Initialize provider outside the function to avoid recreation
const provider = new GoogleAuthProvider();

// Google Sign-In
export const signInWithGoogle = async (router: AppRouterInstance) => {
  try {
    console.log('Starting Google Sign-In process...');
    const result = await signInWithPopup(auth, provider);
    
    if (result.user) {
      const loginResult = await handleFirstLogin(result.user);
      
      if (loginResult.status === 'pending') {
        return { status: 'pending' as const };
      } else if (loginResult.status === 'no_request') {
        return { status: 'no_request' as const };
      } else if (loginResult.status === 'approved') {
        router.replace('/members');
        return { status: 'approved' as const };
      }
      
      return { status: 'exists' as const };
    }
    
    throw new Error('No user returned from Google sign in');
  } catch (error) {
    console.error('Sign-In Error:', error);
    trackEvent('login_error', {
      error_message: (error as Error).message
    });
    throw error;
  }
};

// Sign Out
export const logOut = async () => {
  return signOut(auth).catch(error => {
    console.error('Error signing out:', error);
  });
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

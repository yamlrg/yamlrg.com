import { GoogleAuthProvider, signInWithPopup, signOut, AuthError } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { createUserProfile } from "./firestoreOperations";
import toast from 'react-hot-toast';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { trackEvent } from "@/utils/analytics";
import { ADMIN_EMAILS } from "../config/admin";

// Google Sign-In
export const signInWithGoogle = async (router: AppRouterInstance) => {
  const provider = new GoogleAuthProvider();
  try {
    console.log("Starting Google Sign-In process...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document exists
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (!userDoc.exists()) {
      // Check for approved join request
      const requestsRef = collection(db, "joinRequests");
      const q = query(
        requestsRef, 
        where("email", "==", user.email),
        where("status", "==", "approved")
      );
      const requestSnapshot = await getDocs(q);

      if (requestSnapshot.empty) {
        // No approved request - check for pending request
        const pendingQ = query(
          requestsRef,
          where("email", "==", user.email)
        );
        const pendingSnapshot = await getDocs(pendingQ);

        if (pendingSnapshot.empty) {
          // No request at all
          await signOut(auth);
          toast.error('Please request to join YAMLRG first');
          router.push('/join');
        } else {
          // Has pending request
          await signOut(auth);
          toast.success('Your join request is being reviewed');
          router.push('/join/success');
        }
        return;
      }

      // Create basic user profile for approved user
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        joinedAt: serverTimestamp(),
        showInMembers: false, // Default to hidden until they complete profile
        isApproved: true,
        isAdmin: ADMIN_EMAILS.includes(user.email || ''),
        profileCompleted: false, // New flag
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
    }

    // Always redirect to profile page after login
    router.push("/profile");
    toast.success('Successfully signed in!');

    trackEvent('login', {
      method: 'google',
      new_user: !userDoc.exists()
    });
  } catch (error: unknown) {
    console.error("Sign-In Error:", error);

    // Handle specific auth errors
    if ((error as AuthError).code === 'auth/popup-closed-by-user') {
      toast.error('Sign-in was cancelled. Please try again.');
      return;
    }
    
    if ((error as AuthError).code === 'auth/popup-blocked') {
      toast.error('Sign-in popup was blocked. Please allow popups for this site.');
      return;
    }

    // For all other errors, assume user needs to request access
    toast.error('Please request to join YAMLRG first');
    router.push('/join');

    trackEvent('login_error', {
      error_code: (error as AuthError).code || 'unknown',
      error_message: (error as Error)?.message || 'Unknown error'
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

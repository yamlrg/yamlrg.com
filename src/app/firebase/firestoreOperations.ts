import { db } from "./firebaseConfig";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

// Types for better type safety
export type UserStatus = {
  lookingForCofounder: boolean;
  needsProjectHelp: boolean;
  offeringProjectHelp: boolean;
  isHiring: boolean;
  seekingJob: boolean;
  openToNetworking: boolean;
};

// Create or update user profile
export const createUserProfile = async (user: any, showInMembers: boolean = true) => {
  try {
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      showInMembers: true,
      joinedAt: new Date().toISOString(),
      linkedinUrl: "",
      status: {
        lookingForCofounder: false,
        needsProjectHelp: false,
        offeringProjectHelp: false,
        isHiring: false,
        seekingJob: false,
        openToNetworking: false,
      }
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
};

// Update user's showInMembers preference
export const updateShowInMembers = async (uid: string, showInMembers: boolean) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      showInMembers
    });
  } catch (error) {
    console.error("Error updating showInMembers:", error);
  }
};

// Get user profile
export const getUserProfile = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

// Update user's profile
export const updateUserProfile = async (uid: string, updates: Partial<{
  linkedinUrl: string;
  status: Partial<UserStatus>;
}>) => {
  try {
    await updateDoc(doc(db, "users", uid), updates);
  } catch (error) {
    console.error("Error updating profile:", error);
  }
};

// Get all visible members with optional filters
export const getVisibleMembers = async (filters?: Partial<UserStatus>) => {
  try {
    let q = query(
      collection(db, "users"),
      where("showInMembers", "==", true)
    );

    // Add filters if they exist
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          q = query(q, where(`status.${key}`, "==", true));
        }
      });
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error getting visible members:", error);
    return [];
  }
}; 
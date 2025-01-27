import { db } from "./firebaseConfig";
import { collection, doc, getDoc, setDoc, getDocs, query, where, DocumentData } from "firebase/firestore";
import { User, UserProfile, UserStatus } from "../types";

// Create or update user profile
export const createUserProfile = async (user: User) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Default profile for new users
    const defaultProfile: UserProfile = {
      showInMembers: true,
      linkedinUrl: "",
      status: {
        lookingForCofounder: false,
        needsProjectHelp: false,
        offeringProjectHelp: false,
        isHiring: false,
        seekingJob: false,
        openToNetworking: true,
      }
    };

    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      ...defaultProfile
    });
  }
};

// Get user profile
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  return userSnap.data() as UserProfile;
};

// Update show in members
export const updateShowInMembers = async (userId: string, showInMembers: boolean) => {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { showInMembers }, { merge: true });
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, updates, { merge: true });
};

// Get visible members
export const getVisibleMembers = async (filters: Partial<UserStatus>): Promise<DocumentData[]> => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("showInMembers", "==", true));
  const querySnapshot = await getDocs(q);
  
  const members = querySnapshot.docs.map(doc => doc.data());
  
  // Apply filters if any are set
  if (Object.keys(filters).length > 0) {
    return members.filter(member => {
      return Object.entries(filters).every(([key, value]) => {
        return value ? member.status?.[key] === true : true;
      });
    });
  }
  
  return members;
}; 
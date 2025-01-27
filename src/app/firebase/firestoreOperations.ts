import { db, auth } from "./firebaseConfig";
import { collection, doc, getDoc, setDoc, getDocs, query, where, DocumentData } from "firebase/firestore";
import { User, UserProfile, UserStatus } from "../types";
import { ADMIN_EMAILS } from "../config/admin";

// Create or update user profile
export const createUserProfile = async (user: User) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const defaultProfile: UserProfile = {
      showInMembers: true,
      linkedinUrl: "",
      isApproved: false,
      isAdmin: ADMIN_EMAILS.includes(user.email || ''),
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

// Get all users (for admin)
export const getAllUsers = async (): Promise<DocumentData[]> => {
  const usersRef = collection(db, "users");
  const querySnapshot = await getDocs(usersRef);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

// Approve user
export const approveUser = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    isApproved: true,
    approvedAt: new Date().toISOString(),
    approvedBy: auth.currentUser?.email
  }, { merge: true });
};

// Remove approval
export const removeApproval = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    isApproved: false,
    approvedAt: null,
    approvedBy: null
  }, { merge: true });
};

// Update getVisibleMembers to handle approval status
export const getVisibleMembers = async (filters: Partial<UserStatus>): Promise<DocumentData[]> => {
  const usersRef = collection(db, "users");
  const currentUser = auth.currentUser;
  const userDoc = currentUser ? await getDoc(doc(db, "users", currentUser.uid)) : null;
  const isApproved = userDoc?.data()?.isApproved || false;

  // Base query for visible members
  const q = query(usersRef, where("showInMembers", "==", true));
  const querySnapshot = await getDocs(q);
  
  let members = querySnapshot.docs.map(doc => doc.data());
  
  // If user is not approved, only show unapproved members
  if (!isApproved) {
    members = members.filter(member => !member.isApproved);
  }
  
  // Apply status filters if any are set
  if (Object.keys(filters).length > 0) {
    members = members.filter(member => {
      return Object.entries(filters).every(([key, value]) => {
        return value ? member.status?.[key] === true : true;
      });
    });
  }
  
  return members;
}; 
import { db, auth } from "./firebaseConfig";
import { collection, doc, getDoc, setDoc, getDocs, query, where, DocumentData, orderBy, addDoc } from "firebase/firestore";
import { User, UserProfile } from "../types";
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

// Get visible members
export const getVisibleMembers = async () => {
  try {
    console.log("Starting getVisibleMembers");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No current user");
      return [];
    }

    const userProfile = await getUserProfile(currentUser.uid);
    const isAdmin = ADMIN_EMAILS.includes(currentUser.email || '');
    console.log("User status:", { isAdmin, isApproved: userProfile?.isApproved });

    const usersRef = collection(db, "users");
    let q;

    // If not admin and not approved, only show admins
    if (!isAdmin && !userProfile?.isApproved) {
      console.log("Filtering for admin-only view");
      q = query(usersRef, where("email", "in", ADMIN_EMAILS));
    } else {
      // Show all visible members
      console.log("Showing all visible members");
      q = query(usersRef, where("showInMembers", "==", true));
    }

    const querySnapshot = await getDocs(q);
    const members = querySnapshot.docs.map(doc => doc.data());
    console.log("Found members:", members.length);
    return members;
  } catch (error) {
    console.error("Error in getVisibleMembers:", error);
    return [];
  }
};

export const getReadingList = async () => {
  const readingListRef = collection(db, "readingList");
  const q = query(readingListRef, orderBy("addedAt", "desc"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addToReadingList = async (item: {
  title: string;
  url: string;
  author?: string;
}) => {
  const readingListRef = collection(db, "readingList");
  const currentUser = auth.currentUser;
  
  if (!currentUser) throw new Error("User not authenticated");
  
  await addDoc(readingListRef, {
    ...item,
    addedBy: currentUser.displayName || currentUser.email,
    addedAt: new Date().toISOString(),
  });
}; 
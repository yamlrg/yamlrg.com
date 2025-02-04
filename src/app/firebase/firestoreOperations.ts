import { db, auth } from "./firebaseConfig";
import { collection, doc, getDoc, setDoc, getDocs, query, where, DocumentData, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { User, UserProfile, JoinRequest } from "../types";
import { ADMIN_EMAILS } from "../config/admin";
import { deleteUser } from "firebase/auth";
import { trackEvent } from "@/utils/analytics";
import { getFirestore } from "firebase/firestore";

// Export setDoc for use in other files
export { setDoc, doc };

// Create or update user profile
export const createUserProfile = async (user: User) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const defaultProfile: UserProfile = {
      showInMembers: true,
      linkedinUrl: "",
      isApproved: false,
      isAdmin: ADMIN_EMAILS.includes(user.email ?? ''),
      profileCompleted: false,
      joinedAt: new Date().toISOString(),
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
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    // Remove any sensitive fields from updates
    const safeUpdates = { ...updates };
    delete safeUpdates.isApproved;
    delete safeUpdates.approvedAt;
    delete safeUpdates.approvedBy;
    delete safeUpdates.isAdmin;
    
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, safeUpdates, { merge: true });
  } catch (error) {
    console.error('Error in updateUserProfile:', { userId, updates, error });
    throw error;
  }
};

// Create a separate function for admin operations
export const adminUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
    throw new Error('Unauthorized: Admin access required');
  }

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
    approvedBy: auth.currentUser?.email || ''
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
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No current user");
      return [];
    }

    const userProfile = await getUserProfile(currentUser.uid);
    const isAdmin = ADMIN_EMAILS.includes(currentUser.email ?? '');

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

// Add join request
export const addJoinRequest = async (request: Omit<JoinRequest, 'id'>) => {
  const requestsRef = collection(db, "joinRequests");
  await addDoc(requestsRef, request);
};

// Get all join requests
export const getJoinRequests = async () => {
  const requestsRef = collection(db, "joinRequests");
  const q = query(requestsRef, orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as JoinRequest[];
};

// Update join request status
export const updateJoinRequestStatus = async (
  requestId: string, 
  status: 'approved' | 'rejected',
  approverEmail: string
) => {
  const requestRef = doc(db, "joinRequests", requestId);
  await updateDoc(requestRef, {
    status,
    approvedAt: new Date().toISOString(),
    approvedBy: approverEmail
  });
};

// Add new function
export const deleteUserAccount = async (userId: string) => {
  try {
    // Delete user data from Firestore
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);

    // Delete the auth user
    const currentUser = auth.currentUser;
    if (currentUser) {
      await deleteUser(currentUser);
    }

    // Track deletion
    trackEvent('account_deleted', {
      user_id: userId
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export const handleFirstLogin = async (user: User) => {
  const db = getFirestore();
  
  // Check if there's an approved join request for this email
  const requestsRef = collection(db, 'joinRequests');
  const requestQuery = query(
    requestsRef, 
    where('email', '==', user.email),
    where('status', '==', 'approved')
  );
  const requestSnapshot = await getDocs(requestQuery);
  
  if (!requestSnapshot.empty) {
    // Found approved request, create user doc with request data
    const request = requestSnapshot.docs[0].data();
    
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: request.name || user.displayName,
      photoURL: user.photoURL,
      isApproved: true,
      showInMembers: false,
      profileCompleted: false,
      joinedAt: request.createdAt,
      approvedAt: request.approvedAt,
      approvedBy: request.approvedBy,
      linkedinUrl: request.linkedinUrl || '',
      status: {
        lookingForCofounder: false,
        needsProjectHelp: false,
        offeringProjectHelp: false,
        isHiring: false,
        seekingJob: false,
        openToNetworking: false,
      }
    });
    return;
  }
  
  // If no approved request found, create basic user doc
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isApproved: false,
    showInMembers: false,
    profileCompleted: false,
    joinedAt: new Date().toISOString(),
    status: {
      lookingForCofounder: false,
      needsProjectHelp: false,
      offeringProjectHelp: false,
      isHiring: false,
      seekingJob: false,
      openToNetworking: false,
    }
  });
}; 
import { db, auth } from "./firebaseConfig";
import { collection, doc, getDoc, setDoc, getDocs, query, where, DocumentData, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { User, UserProfile, JoinRequest, Workshop, PresentationRequest } from "../types";
import { ADMIN_EMAILS } from "../config/admin";
import { deleteUser } from "firebase/auth";
import { trackEvent } from "@/utils/analytics";
import { FirebaseError } from "firebase/app";

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
export const getUserProfile = async (userId: string) => {
  try {
    if (!userId) {
      console.log('No user ID provided');
      return null;
    }

    const userRef = doc(db, "users", userId);
    
    try {
      const userSnap = await getDoc(userRef);
      console.log('User document exists:', userSnap.exists());
      
      if (!userSnap.exists()) {
        console.log('No user found with ID:', userId);
        return null;
      }

      const data = userSnap.data();
      
      if (!data) {
        console.log('No data in user document:', userId);
        return null;
      }

      const profile = {
        ...data,
        uid: userSnap.id,
        showInMembers: data.showInMembers ?? false,
        linkedinUrl: data.linkedinUrl ?? '',
        isApproved: data.isApproved ?? false,
        isAdmin: data.isAdmin ?? false,
        profileCompleted: data.profileCompleted ?? false,
        status: data.status ?? {
          lookingForCofounder: false,
          needsProjectHelp: false,
          offeringProjectHelp: false,
          isHiring: false,
          seekingJob: false,
          openToNetworking: false,
        }
      } as UserProfile;

      return profile;
    } catch (error) {
      console.error('Error getting user document:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
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
    delete safeUpdates.isAdmin;
    
    // Only allow admins to modify approval status
    if (!ADMIN_EMAILS.includes(auth.currentUser?.email || '')) {
      delete safeUpdates.isApproved;
      delete safeUpdates.approvedAt;
      delete safeUpdates.approvedBy;
    }
    
    const userRef = doc(db, "users", userId);
    
    // First, check if document exists
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      throw new Error('User document not found');
    }

    // Always include lastUpdate timestamp
    await updateDoc(userRef, {
      ...safeUpdates,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in updateUserProfile:', {
      userId,
      updates,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof FirebaseError ? error.code : 'unknown',
      errorObject: error
    });
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
    let members: DocumentData[] = [];

    // If not admin and not approved, only show admins
    if (!isAdmin && !userProfile?.isApproved) {
      console.log("Filtering for admin-only view");
      const adminQuery = query(usersRef, where("email", "in", ADMIN_EMAILS));
      const adminSnapshot = await getDocs(adminQuery);
      members = adminSnapshot.docs.map(doc => doc.data());
    } else {
      // Get visible members
      const visibleQuery = query(usersRef, where("showInMembers", "==", true));
      const visibleSnapshot = await getDocs(visibleQuery);
      const visibleMembers = visibleSnapshot.docs.map(doc => doc.data());

      // Get admin members
      const adminQuery = query(usersRef, where("email", "in", ADMIN_EMAILS));
      const adminSnapshot = await getDocs(adminQuery);
      const adminMembers = adminSnapshot.docs.map(doc => doc.data());

      // Combine and deduplicate members
      const memberMap = new Map();
      [...visibleMembers, ...adminMembers].forEach(member => {
        memberMap.set(member.uid, member);
      });
      members = Array.from(memberMap.values());
    }

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
  try {
    console.log('Starting handleFirstLogin for user:', user.email);
    
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      console.log('User document already exists');
      return;
    }

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

    // After creating the basic profile, check for approved join request
    const requestsRef = collection(db, 'joinRequests');
    const requestsSnap = await getDocs(requestsRef);
    
    const matchingRequest = requestsSnap.docs.find(doc => {
      const data = doc.data();
      return data.email === user.email && data.status === 'approved';
    });

    if (matchingRequest) {
      const request = matchingRequest.data();
      console.log('Found approved request, updating profile...');
      
      await updateDoc(userRef, {
        isApproved: true,
        showInMembers: true,
        linkedinUrl: request.linkedinUrl || '',
        approvedAt: request.approvedAt,
        approvedBy: request.approvedBy
      });
    }

    console.log('Successfully handled first login');
    
  } catch (error) {
    console.error('Error in handleFirstLogin:', error);
    throw error;
  }
};

// Get all workshops
export const getWorkshops = async () => {
  const workshopsRef = collection(db, "workshops");
  const q = query(workshopsRef, orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Workshop[];
};

// Add workshop (admin only)
export const addWorkshop = async (workshop: Omit<Workshop, 'id'>) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
    throw new Error('Unauthorized: Admin access required');
  }

  const workshopsRef = collection(db, "workshops");
  await addDoc(workshopsRef, workshop);
};

// Update workshop (admin only)
export const updateWorkshop = async (workshopId: string, updates: Partial<Workshop>) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
    throw new Error('Unauthorized: Admin access required');
  }

  const workshopRef = doc(db, "workshops", workshopId);
  await updateDoc(workshopRef, updates);
};

// Delete workshop (admin only)
export const deleteWorkshop = async (workshopId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
    throw new Error('Unauthorized: Admin access required');
  }

  const workshopRef = doc(db, "workshops", workshopId);
  await deleteDoc(workshopRef);
};

// Add presentation request
export const addPresentationRequest = async (request: Omit<PresentationRequest, 'id' | 'status' | 'createdAt'>) => {
  const requestsRef = collection(db, "presentationRequests");
  await addDoc(requestsRef, {
    ...request,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
};

// Get presentation requests (admin only)
export const getPresentationRequests = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      throw new Error('No authenticated user');
    }
    
    if (!ADMIN_EMAILS.includes(currentUser.email)) {
      throw new Error('Unauthorized: Admin access required');
    }

    const requestsRef = collection(db, "presentationRequests");
    const q = query(requestsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PresentationRequest[];
  } catch (error) {
    console.error('Error getting presentation requests:', error);
    throw error;
  }
};

// Update presentation request status (admin only)
export const updatePresentationRequestStatus = async (
  requestId: string,
  status: 'pending' | 'done',
  completedBy: string
) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
    throw new Error('Unauthorized: Admin access required');
  }

  const requestRef = doc(db, "presentationRequests", requestId);
  await updateDoc(requestRef, {
    status,
    ...(status === 'done' ? {
      completedAt: new Date().toISOString(),
      completedBy
    } : {
      completedAt: null,
      completedBy: null
    })
  });
};

export const deletePresentationRequest = async (requestId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      throw new Error('No authenticated user');
    }
    
    if (!ADMIN_EMAILS.includes(currentUser.email)) {
      throw new Error('Unauthorized: Admin access required');
    }

    const requestRef = doc(db, "presentationRequests", requestId);
    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error deleting presentation request:', error);
    throw error;
  }
};

// Remove approval from a user
export const removeUserApproval = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      isApproved: false,
      showInMembers: false,
      approvedAt: null,
      approvedBy: null
    });
  } catch (error) {
    console.error('Error removing user approval:', error);
    throw error;
  }
};

// Toggle user visibility in members directory
export const updateUserVisibility = async (userId: string, showInMembers: boolean) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      showInMembers: showInMembers
    });
  } catch (error) {
    console.error('Error updating user visibility:', error);
    throw error;
  }
}; 
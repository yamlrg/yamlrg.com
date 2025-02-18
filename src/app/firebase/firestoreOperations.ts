import { db, auth } from "./firebaseConfig";
import { collection, doc, getDoc, setDoc, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { User, YamlrgUserProfile, JoinRequest, Workshop, PresentationRequest } from "../types";
import { ADMIN_EMAILS } from "../config/admin";
import { deleteUser } from "firebase/auth";
import { trackEvent } from "@/utils/analytics";
import { FirebaseError } from "firebase/app";

// Export setDoc for use in other files
export { setDoc, doc };

// Create or update user profile
export const createUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const defaultProfile: YamlrgUserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        showInMembers: true,
        linkedinUrl: "",
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

      await setDoc(userRef, defaultProfile);
      return defaultProfile;
    }

    return userSnap.data() as YamlrgUserProfile;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
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
      } as YamlrgUserProfile;

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
export const updateUserProfile = async (userId: string, updates: Partial<YamlrgUserProfile>) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    // Remove any sensitive fields from updates
    const safeUpdates = { ...updates };
    delete safeUpdates.isAdmin;
    
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
export const adminUpdateUser = async (userId: string, updates: Partial<YamlrgUserProfile>) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
    throw new Error('Unauthorized: Admin access required');
  }

  const userRef = doc(db, "users", userId);
  await setDoc(userRef, updates, { merge: true });
};

// Get all users (for admin)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName || '',
        photoURL: data.photoURL || '',
        showInMembers: data.showInMembers || false,
        linkedinUrl: data.linkedinUrl || '',
        isAdmin: ADMIN_EMAILS.includes(data.email || ''),
        profileCompleted: data.profileCompleted || false,
        joinedAt: data.joinedAt || '',
        approvedAt: data.approvedAt,
        status: data.status || {
          lookingForCofounder: false,
          needsProjectHelp: false,
          offeringProjectHelp: false,
          isHiring: false,
          seekingJob: false,
          openToNetworking: false,
        },
        jobListings: data.jobListings || []
      } as YamlrgUserProfile;
    });
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
};

// Approve user
export const approveUser = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    isApproved: true,
    approvedAt: new Date().toISOString(),
    approvedBy: auth.currentUser?.email ?? ''
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
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log('No authenticated user');
      return [];
    }

    const members = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          id: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          photoURL: data.photoURL || '',
          showInMembers: data.showInMembers || false,
          linkedinUrl: data.linkedinUrl || '',
          isAdmin: ADMIN_EMAILS.includes(data.email || ''),
          profileCompleted: data.profileCompleted || false,
          joinedAt: data.joinedAt || '',
          approvedAt: data.approvedAt,
          status: data.status || {
            lookingForCofounder: false,
            needsProjectHelp: false,
            offeringProjectHelp: false,
            isHiring: false,
            seekingJob: false,
            openToNetworking: false,
          }
        } as YamlrgUserProfile;
      })
      .filter(user => {
        // Show admins and users who have opted to be visible
        return ADMIN_EMAILS.includes(user.email) || user.showInMembers;
      })
      .sort((a, b) => {
        // Sort admins to the top
        const aIsAdmin = ADMIN_EMAILS.includes(a.email);
        const bIsAdmin = ADMIN_EMAILS.includes(b.email);
        
        if (aIsAdmin && !bIsAdmin) return -1;
        if (!aIsAdmin && bIsAdmin) return 1;
        
        // For non-admins or between admins, sort by display name
        const aName = a.displayName.toLowerCase();
        const bName = b.displayName.toLowerCase();
        return aName.localeCompare(bName);
      });

    return members;
  } catch (error) {
    console.error("Error getting visible members:", error);
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
  status: 'approved' | 'rejected' | 'pending',
  updatedBy: string
) => {
  try {
    const requestRef = doc(db, 'joinRequests', requestId);
    const updateData: {
      status: 'approved' | 'rejected' | 'pending';
      approvedAt?: string;
      approvedBy?: string;
    } = {
      status
    };

    if (status === 'approved') {
      updateData.approvedAt = new Date().toISOString();
      updateData.approvedBy = updatedBy;
    }

    await updateDoc(requestRef, updateData);
  } catch (error) {
    console.error('Error updating join request:', error);
    throw error;
  }
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
      return { status: 'exists' as const };
    }

    // Check for any join request for this email
    const requestsRef = collection(db, 'joinRequests');
    const requestsSnap = await getDocs(requestsRef);
    
    const matchingRequest = requestsSnap.docs.find(doc => {
      const data = doc.data();
      return data.email === user.email;
    });

    // If no request exists at all, redirect to join page
    if (!matchingRequest) {
      await auth.signOut();
      return { status: 'no_request' as const };
    }

    // If request exists but isn't approved, show pending message
    const request = matchingRequest.data();
    if (request.status !== 'approved') {
      await auth.signOut();
      return { status: 'pending' as const };
    }

    // If we get here, request exists and is approved
    const approvedAt = request.approvedAt;

    // Create user profile
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      showInMembers: true,
      linkedinUrl: request.linkedinUrl || '',
      isAdmin: ADMIN_EMAILS.includes(user.email ?? ''),
      profileCompleted: false,
      joinedAt: approvedAt,
      approvedAt: approvedAt,
      status: {
        lookingForCofounder: false,
        needsProjectHelp: false,
        offeringProjectHelp: false,
        isHiring: false,
        seekingJob: false,
        openToNetworking: true,
      }
    });

    console.log('Successfully handled first login');
    return { status: 'approved' as const };
    
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

export const fixMissingJoinDates = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    const updates = querySnapshot.docs
      .filter(doc => {
        const data = doc.data();
        return !data.joinedAt && data.approvedAt;
      })
      .map(async (doc) => {
        const data = doc.data();
        console.log(`Fixing joinedAt for user: ${data.email}`);
        const userRef = doc.ref;
        return updateDoc(userRef, {
          joinedAt: data.approvedAt
        });
      });

    await Promise.all(updates);
    console.log('Fixed join dates for all users');
  } catch (error) {
    console.error('Error fixing join dates:', error);
    throw error;
  }
};

export const fixTimestampJoinDates = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    const updates = querySnapshot.docs
      .filter(doc => {
        const data = doc.data();
        // Check if joinedAt is a Timestamp
        return data.joinedAt && typeof data.joinedAt.toDate === 'function';
      })
      .map(async (doc) => {
        const data = doc.data();
        console.log(`Converting Timestamp joinedAt to ISO string for user: ${data.email}`);
        const userRef = doc.ref;
        
        // Convert Timestamp to ISO string
        const timestamp = data.joinedAt;
        const date = timestamp.toDate();
        const isoString = date.toISOString();
        
        return updateDoc(userRef, {
          joinedAt: isoString
        });
      });

    await Promise.all(updates);
    console.log('Converted all Timestamp joinedAt fields to ISO strings');
  } catch (error) {
    console.error('Error fixing timestamp join dates:', error);
    throw error;
  }
}; 
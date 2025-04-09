import { db, auth } from "./firebaseConfig";
import { collection, doc, getDoc, setDoc, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, where, arrayUnion } from "firebase/firestore";
import { User, YamlrgUserProfile, JoinRequest, Workshop, PresentationRequest } from "../types";
import { ADMIN_EMAILS } from "../config/admin";
import { deleteUser } from "firebase/auth";
import { trackEvent } from "@/utils/analytics";
import { FirebaseError } from "firebase/app";
import { 
  POINTS, 
  POINTS_SYSTEM,
  PointCategory 
} from '../config/points';
import { getWeekNumber } from '@/utils/dateUtils';
import { getFirestore } from "firebase/firestore";

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
        showEmail: true,
        linkedinUrl: "",
        profileCompleted: false,
        joinedAt: new Date().toISOString(),
        isApproved: false,
        points: 0,
        pointsHistory: [],
        interests: [],
        lookingFor: {
          cofounder: false,
          wannabeFounders: false,
          investors: false,
          customers: false,
          hiring: false,
          fundraising: false,
          partnerships: false,
          advice: false
        },
        isInvestor: false,
        status: {
          needsProjectHelp: false,
          offeringProjectHelp: false,
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
        email: data.email ?? '',
        isApproved: data.isApproved ?? false,
        points: data.points ?? 0,
        pointsHistory: data.pointsHistory ?? [],
        profileCompleted: data.profileCompleted ?? false,
        status: data.status ?? {
          needsProjectHelp: false,
          offeringProjectHelp: false,
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
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id,
      points: doc.data().points || 0,
      pointsHistory: doc.data().pointsHistory || []
    })) as YamlrgUserProfile[];
  } catch (error) {
    console.error('Error getting users:', error);
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
export async function getVisibleMembers(): Promise<YamlrgUserProfile[]> {
  const db = getFirestore();
  const q = query(collection(db, 'users'));
  
  const snapshot = await getDocs(q);
  
  // Create a map to store unique users by email
  const uniqueUsers = new Map<string, YamlrgUserProfile>();
  // Track which duplicates we've already logged
  const loggedDuplicates = new Set<string>();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const email = data.email;
    
    // If this email already exists in our map, log the duplicate
    if (uniqueUsers.has(email)) {
      const existingUser = uniqueUsers.get(email)!;
      
      // Only log if we haven't logged this pair before
      const duplicatePair = `${existingUser.uid}-${doc.id}`;
      if (!loggedDuplicates.has(duplicatePair)) {
        const existingJoinedAt = new Date(existingUser.joinedAt || 0);
        const newJoinedAt = new Date(data.joinedAt || 0);
        
        console.log('Found duplicate user:', {
          email,
          existingProfile: {
            id: existingUser.uid,
            joinedAt: existingUser.joinedAt,
            displayName: existingUser.displayName
          },
          duplicateProfile: {
            id: doc.id,
            joinedAt: data.joinedAt,
            displayName: data.displayName
          },
          keepingProfile: newJoinedAt > existingJoinedAt ? 'duplicate' : 'existing'
        });
        loggedDuplicates.add(duplicatePair);
      }
      
      const existingJoinedAt = new Date(existingUser.joinedAt || 0);
      const newJoinedAt = new Date(data.joinedAt || 0);
      
      if (newJoinedAt > existingJoinedAt) {
        uniqueUsers.set(email, {
          uid: doc.id,
          email: data.email,
          showInMembers: data.showInMembers,
          ...data,
          bestWayToReach: data.bestWayToReach || [],
        } as YamlrgUserProfile);
      }
    } else {
      uniqueUsers.set(email, {
        uid: doc.id,
        email: data.email,
        showInMembers: data.showInMembers,
        ...data,
        bestWayToReach: data.bestWayToReach || [],
      } as YamlrgUserProfile);
    }
  });
  
  return Array.from(uniqueUsers.values())
    .filter(user => ADMIN_EMAILS.includes(user.email) || user.showInMembers)
    .sort((a, b) => {
      // Sort admins to the top
      const aIsAdmin = ADMIN_EMAILS.includes(a.email);
      const bIsAdmin = ADMIN_EMAILS.includes(b.email);
      
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      
      // For non-admins or between admins, sort by display name
      const aName = (a.displayName || a.email || '').toLowerCase();
      const bName = (b.displayName || b.email || '').toLowerCase();
      return aName.localeCompare(bName);
    });
}

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
  const currentUser = auth.currentUser;
  
  if (!currentUser) throw new Error("User not authenticated");
  if (!currentUser.email) throw new Error("User email not found");
  
  await addDoc(collection(db, "readingList"), {
    ...item,
    addedBy: currentUser.email,
    addedByName: currentUser.displayName || currentUser.email,
    addedAt: new Date().toISOString(),
  });

  // Award points for adding to reading list
  await updateUserPoints(currentUser.uid, 'content.reading_list');
};

export const addJoinRequest = async (request: Omit<JoinRequest, 'id'>) => {
  try {
    // Check for existing request with this email using a query
    const requestsRef = collection(db, "joinRequests");
    const q = query(
      requestsRef, 
      where("email", "==", request.email.toLowerCase())
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Log and track duplicate attempt
      console.log(`Duplicate join request attempt for email: ${request.email}`);
      trackEvent('duplicate_join_request', {
        email: request.email,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, exists: true };
    }

    // If no existing request, create new one
    const docRef = await addDoc(requestsRef, {
      ...request,
      email: request.email.toLowerCase()
    });

    return { success: true, exists: false, id: docRef.id };
  } catch (error) {
    console.error('Error creating join request:', error);
    throw error;
  }
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

// Add this function
export const deleteJoinRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, 'joinRequests', requestId);
    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error deleting join request:', error);
    throw error;
  }
};

// Add new function
export const deleteUserAccount = async (userId: string) => {
  try {
    // Delete user data from Firestore
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);

    // We'll skip deleting the auth user due to Firebase security requirements
    // that require recent authentication for sensitive operations
    console.log('User document deleted from Firestore. Auth user deletion skipped due to security requirements.');

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
    console.log('handleFirstLogin called for user:', user.email);
    
    // Check if user is an admin first
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      console.log('User is an admin, checking for existing profile by email');
      
      // First check if there's an existing profile with this email
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        console.log('Found existing admin profile with ID:', existingDoc.id);
        return { status: 'exists' as const };
      }

      // If no existing profile found, create a new admin profile
      console.log('No existing admin profile found, creating new one');
      const userRef = doc(db, "users", user.uid);
      
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        showInMembers: true,
        showEmail: true,
        linkedinUrl: '',
        isAdmin: true,
        profileCompleted: true,
        joinedAt: new Date().toISOString(),
        interests: [],
        lookingFor: {
          cofounder: false,
          wannabeFounders: false,
          investors: false,
          customers: false,
          hiring: false,
          fundraising: false,
          partnerships: false,
          advice: false
        },
        isInvestor: false,
        status: {
          needsProjectHelp: false,
          offeringProjectHelp: false,
          openToNetworking: true,
        }
      };

      console.log('Creating admin profile with data:', userProfile);
      await setDoc(userRef, userProfile);
      console.log('Successfully created admin profile');

      return { status: 'approved' as const };
    }
    
    // For non-admin users, continue with the existing logic
    console.log('User is not an admin, checking for existing profile by email');
    
    // First check if there's an existing profile with this email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      console.log('Found existing profile with ID:', existingDoc.id);
      return { status: 'exists' as const };
    }

    // If no existing profile found, check for join request
    console.log('No existing profile found, checking for join request with email:', user.email);
    const requestsRef = collection(db, 'joinRequests');
    const requestsSnap = await getDocs(requestsRef);
    
    const matchingRequest = requestsSnap.docs.find(doc => {
      const data = doc.data();
      const matches = data.email.toLowerCase() === user.email?.toLowerCase();
      if (matches) {
        console.log('Found matching join request for email:', user.email);
      }
      return matches;
    });

    // If no request exists at all, redirect to join page
    if (!matchingRequest) {
      console.log('No join request found for email:', user.email);
      await auth.signOut();
      return { status: 'no_request' as const };
    }

    // If request exists but isn't approved, show pending message
    const request = matchingRequest.data();
    console.log('Found join request:', request);
    
    if (request.status !== 'approved') {
      console.log('Join request exists but status is:', request.status);
      await auth.signOut();
      return { status: 'pending' as const };
    }

    // If we get here, request exists and is approved
    console.log('Join request is approved, creating user profile');
    const approvedAt = request.approvedAt;

    // Create user profile
    const userProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      showInMembers: true,
      showEmail: true,
      linkedinUrl: request.linkedinUrl || '',
      isAdmin: ADMIN_EMAILS.includes(user.email ?? ''),
      profileCompleted: false,
      joinedAt: approvedAt,
      approvedAt: approvedAt,
      interests: [],
      lookingFor: {
        cofounder: false,
        wannabeFounders: false,
        investors: false,
        customers: false,
        hiring: false,
        fundraising: false,
        partnerships: false,
        advice: false
      },
      isInvestor: false,
      status: {
        needsProjectHelp: false,
        offeringProjectHelp: false,
        openToNetworking: true,
      }
    };

    console.log('Creating user profile with data:', userProfile);
    await setDoc(doc(db, "users", user.uid), userProfile);
    console.log('Successfully created user profile');

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

  // Award points to the presenter if we have their email
  if (workshop.presenterEmail) {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", workshop.presenterEmail));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const presenterDoc = querySnapshot.docs[0];
      await updateUserPoints(presenterDoc.id, 'participation.workshop_presentation');
    }
  }
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
    if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
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

export const deleteReadingListItem = async (itemId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      throw new Error('No authenticated user email');
    }

    // Get the item to check ownership
    const itemRef = doc(db, "readingList", itemId);
    const itemSnap = await getDoc(itemRef);
    
    if (!itemSnap.exists()) {
      throw new Error('Item not found');
    }

    const itemData = itemSnap.data();
    
    // Check ownership using email
    if (itemData.addedBy !== currentUser.email && 
        !ADMIN_EMAILS.includes(currentUser.email)) {
      throw new Error('Unauthorized: You can only delete your own items');
    }

    // Check if item is less than 2 weeks old
    const addedAt = new Date(itemData.addedAt);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // If item is less than 2 weeks old, remove the point
    if (addedAt > twoWeeksAgo) {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as YamlrgUserProfile;
        await updateDoc(userRef, {
          points: (userData.points || 0) - POINTS.READING_LIST_ADD,
          pointsHistory: arrayUnion({
            timestamp: new Date().toISOString(),
            action: 'READING_LIST_REMOVE',
            points: -POINTS.READING_LIST_ADD,
            total: (userData.points || 0) - POINTS.READING_LIST_ADD
          })
        });
      }
    }

    await deleteDoc(itemRef);
    
    // Track deletion
    trackEvent('reading_list_item_deleted', {
      title: itemData.title,
      by_admin: ADMIN_EMAILS.includes(currentUser.email),
      points_removed: addedAt > twoWeeksAgo
    });
  } catch (error) {
    console.error('Error deleting reading list item:', error);
    throw error;
  }
};

// Add this new type
export type PointActionPath = `${PointCategory}.${string}`;

// Update the function signature
export const updateUserPoints = async (userId: string, actionPath: PointActionPath) => {
  try {
    const [category, action] = actionPath.split('.') as [PointCategory, string];
    if (!category || !action || !POINTS_SYSTEM[category]?.[action]) {
      throw new Error('Invalid points action');
    }

    const pointValue = POINTS_SYSTEM[category][action].value;
    const actionLabel = POINTS_SYSTEM[category][action].label;

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const currentPoints = userData?.points || 0;
    const newTotal = currentPoints + pointValue;

    const newHistory = [
      ...(userData?.pointsHistory || []),
      {
        timestamp: new Date().toISOString(),
        action: actionLabel,
        points: pointValue,
        total: newTotal
      }
    ];

    await updateDoc(userRef, {
      points: newTotal,
      pointsHistory: newHistory
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user points:', error);
    throw error;
  }
};

export const trackUserLogin = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() as YamlrgUserProfile;

    const now = new Date();
    const currentWeek = getWeekNumber(now);

    if (userData.lastLoginWeek !== currentWeek) {
      await updateDoc(userRef, {
        lastLoginWeek: currentWeek,
        loginStreak: (userData.loginStreak || 0) + 1
      });

      // Award points for weekly login
      await updateUserPoints(userId, 'engagement.weekly_login');

      // Award bonus points for first login streak
      if (!userData.hasFirstLoginStreak && (userData.loginStreak || 0) >= 3) {
        await updateUserPoints(userId, 'engagement.login_streak');
        await updateDoc(userRef, { hasFirstLoginStreak: true });
      }
    } else {
      // If they haven't logged in for more than a week, reset the streak
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekNumber = getWeekNumber(lastWeek);
      
      if (userData.lastLoginWeek && userData.lastLoginWeek < lastWeekNumber) {
        await updateDoc(userRef, {
          loginStreak: 1
        });
      }
    }
  } catch (error) {
    console.error('Error tracking login:', error);
  }
}; 
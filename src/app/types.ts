import { User as FirebaseUser } from 'firebase/auth';

export interface UserStatus {
  lookingForCofounder: boolean;
  needsProjectHelp: boolean;
  offeringProjectHelp: boolean;
  isHiring: boolean;
  seekingJob: boolean;
  openToNetworking: boolean;
}

export interface JobListing {
  title: string;
  company: string;
  link: string;
  postedAt: string;
}

export interface YamlrgUserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  linkedinUrl?: string;
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  joinedAt?: string;
  lastUpdate?: string;
  showInMembers: boolean;
  showEmail: boolean;
  profileCompleted: boolean;
  status: UserStatus;
  points: number;
  pointsHistory?: {
    timestamp: string;
    action: string;
    points: number;
    total: number;
    reason?: string;
  }[];
  lastLoginWeek?: string;
  loginStreak?: number;
  hasFirstLoginStreak?: boolean;
  jobListings?: JobListing[];
}

// Extend Firebase User with our additional properties
export interface User extends FirebaseUser {
  linkedinUrl?: string;
  status?: UserStatus;
}

export interface JoinRequest {
  id?: string;
  email: string;
  name: string;
  interests: string;
  linkedinUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Workshop {
  id?: string;
  title: string;
  presenterName: string;
  presenterLinkedIn?: string;
  presenterEmail?: string;
  date: string;
  description: string;
  youtubeUrl?: string;
  resources?: string[];
  type: 'paper' | 'startup' | 'other';
}

export interface PresentationRequest {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  type: 'paper' | 'startup' | 'other' | 'request';
  proposedDate?: string;
  status: 'pending' | 'done';
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
}

export interface GradientConnectSignup {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  matchingDate: string;
  signedUpAt: string;
  createdAt: string;
  status: {
    matched: boolean;
    matchedWith?: string;
    matchedWithName?: string;
    inviteSent: boolean;
    inviteSentAt?: string;
    inviteAccepted: boolean;
    inviteAcceptedAt?: string;
    attended: boolean;
    notes?: string;
  };
} 
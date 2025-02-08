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

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
  isApproved?: boolean;
  showInMembers: boolean;
  linkedinUrl: string;
  status: UserStatus;
  profileCompleted: boolean;
  approvedAt?: string;
  approvedBy?: string;
  joinedAt?: string;
  jobListings?: JobListing[];
}

// Extend Firebase User with our additional properties
export interface User extends FirebaseUser {
  linkedinUrl?: string;
  status?: UserStatus;
}

// For when we need the full user data
export interface ExtendedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isApproved: boolean;
  showInMembers: boolean;
  profileCompleted: boolean;
  linkedinUrl?: string;
  approvedAt?: string;
  joinedAt?: string;
  status?: {
    lookingForCofounder: boolean;
    needsProjectHelp: boolean;
    offeringProjectHelp: boolean;
    isHiring: boolean;
    seekingJob: boolean;
    openToNetworking: boolean;
  };
  jobListings?: Array<{
    title: string;
    company: string;
    link: string;
    postedAt: string;
  }>;
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
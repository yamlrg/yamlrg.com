import { User as FirebaseUser } from 'firebase/auth';

export interface UserStatus {
  needsProjectHelp: boolean;
  offeringProjectHelp: boolean;
  openToNetworking: boolean;
}

export interface JobListing {
  title: string;
  company: string;
  link: string;
  postedAt: string;
}

export interface CompanyInfo {
  name: string;
  website?: string;
  stage: 'idea' | 'pre-seed' | 'seed' | 'series-a' | 'scaling' | 'enterprise' | 'none';
  industry?: string;
}

export interface TractionInfo {
  revenue?: string;
  users?: string;
  fundingRaised?: string;
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
  company?: CompanyInfo;
  role?: string;
  location?: string;
  timezone?: string;
  interests: string[];
  lookingFor: {
    cofounder: boolean;
    wannabeFounders: boolean;
    investors: boolean;
    customers: boolean;
    hiring: boolean;
    fundraising: boolean;
    partnerships: boolean;
    advice: boolean;
  };
  traction?: TractionInfo;
  bestWayToReach?: Array<{ id: string; value: string } | string>;
  isInvestor: boolean;
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

export interface GradientConnectEvent {
  id?: string;
  date: string;
  createdAt: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export interface GradientConnectSignup {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  matchingDate: string;
  status: {
    inviteSent: boolean;
    inviteAccepted: boolean;
    matched: boolean;
    matchedWith?: string;
    matchedWithName?: string;
  };
  createdAt: string;
}

export interface UserProfile {
  id?: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  title?: string;
  bio?: string;
  location?: string;
  company?: string;
  education?: string;
  skills?: string[];
  lookingFor?: string;
  offeringHelp?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  createdAt?: string;
} 
import { User as FirebaseUser } from 'firebase/auth';

export interface UserStatus {
  lookingForCofounder: boolean;
  needsProjectHelp: boolean;
  offeringProjectHelp: boolean;
  isHiring: boolean;
  seekingJob: boolean;
  openToNetworking: boolean;
}

export interface UserProfile {
  showInMembers: boolean;
  linkedinUrl: string;
  status: UserStatus;
  isApproved: boolean;
  isAdmin: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

// Extend Firebase User with our additional properties
export interface User extends FirebaseUser {
  linkedinUrl?: string;
  status?: UserStatus;
}

// For when we need the full user data
export interface ExtendedUser extends FirebaseUser {
  linkedinUrl: string;
  status: UserStatus;
  isApproved: boolean;
  isAdmin: boolean;
  approvedAt?: string;
  approvedBy?: string;
  showInMembers: boolean;
} 
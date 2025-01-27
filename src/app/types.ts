import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  showInMembers: boolean;
  linkedinUrl: string;
  status: UserStatus;
}

export interface UserStatus {
  lookingForCofounder: boolean;
  needsProjectHelp: boolean;
  offeringProjectHelp: boolean;
  isHiring: boolean;
  seekingJob: boolean;
  openToNetworking: boolean;
}

// Extend Firebase User with our additional properties
export interface User extends FirebaseUser {
  linkedinUrl?: string;
  status?: UserStatus;
}

// For when we need the full user data
export interface ExtendedUser extends User {
  linkedinUrl: string;
  status: UserStatus;
} 
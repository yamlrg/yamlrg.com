'use client';

import { auth, db } from "../firebase/firebaseConfig";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserProfile, updateShowInMembers, updateUserProfile, deleteUserAccount } from "../firebase/firestoreOperations";
import { UserStatus, JobListing } from "../types";
import Image from "next/image";
import toast, { Toaster } from 'react-hot-toast';
import { doc, updateDoc } from "firebase/firestore";
import { trackEvent } from "@/utils/analytics";
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface Profile {
  showInMembers: boolean;
  linkedinUrl: string;
  status: UserStatus;
  isApproved: boolean;
  jobListings?: JobListing[];
  profileCompleted: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    link: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showJobListings, setShowJobListings] = useState(false);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setProfile({
            ...userProfile,
            profileCompleted: userProfile.profileCompleted ?? false
          } as Profile);
          setLinkedinUrl(userProfile.linkedinUrl ?? "");
          setProfileCompleted(userProfile.profileCompleted ?? false);
        }
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleVisibilityToggle = async () => {
    if (user && profile) {
      setHasChanges(true);
      const newShowInMembers = !profile.showInMembers;
      await updateShowInMembers(user.uid, newShowInMembers);
      trackEvent('profile_visibility_update', {
        visible: newShowInMembers
      });
      setProfile({ ...profile, showInMembers: newShowInMembers });
    }
  };

  const handleStatusToggle = async (statusKey: keyof UserStatus) => {
    if (user && profile) {
      setHasChanges(true);
      const newStatus = {
        ...profile.status,
        [statusKey]: !profile.status[statusKey]
      };
      await updateUserProfile(user.uid, { status: newStatus });
      trackEvent('profile_status_update', {
        status_type: statusKey,
        new_value: newStatus[statusKey]
      });
      setProfile({ ...profile, status: newStatus });
    }
  };

  const handleProfileUpdate = async () => {
    if (user && profile) {
      try {
        await updateUserProfile(user.uid, { 
          linkedinUrl,
          showInMembers: profile.showInMembers,
          status: profile.status
        });
        setProfile({
          ...profile,
          linkedinUrl
        });
        setHasChanges(false);
        toast.success('Profile updated successfully!');
      } catch (error) {
        toast.error('Failed to update profile. Please try again.');
      }
    }
  };

  const handleAddJob = async () => {
    if (!user || !profile) return;
    
    const jobListing: JobListing = {
      ...newJob,
      postedAt: new Date().toISOString()
    };

    const updatedListings = [...(profile.jobListings || []), jobListing];
    
    try {
      await updateUserProfile(user.uid, { 
        jobListings: updatedListings 
      });
      trackEvent('job_listing_added', {
        company: newJob.company,
        title: newJob.title
      });
      setProfile({
        ...profile,
        jobListings: updatedListings
      });
      setNewJob({ title: '', company: '', link: '' });
      setShowNewJobForm(false);
      toast.success('Job listing added successfully!');
    } catch (error) {
      toast.error('Failed to add job listing');
      console.error('Error adding job:', error);
    }
  };

  const handleRemoveJob = async (index: number) => {
    if (!user || !profile?.jobListings) {
      console.log('No user or job listings found:', { user, profile });
      return;
    }

    try {
      console.log('Starting job removal:', {
        userId: user.uid,
        jobIndex: index,
        currentListings: profile.jobListings
      });

      // Create new array without the deleted job
      const updatedListings = [...profile.jobListings];
      updatedListings.splice(index, 1);
      
      console.log('Prepared updated listings:', {
        before: profile.jobListings,
        after: updatedListings
      });

      // Update in Firebase
      const userRef = doc(db, 'users', user.uid);
      console.log('Attempting Firestore update for user:', user.uid);
      
      await updateDoc(userRef, {
        jobListings: updatedListings || []
      });
      
      console.log('Firestore update successful');

      // Update local state
      setProfile(prev => ({
        ...prev!,
        jobListings: updatedListings
      }));
      
      toast.success('Job listing removed successfully!');
    } catch (error) {
      console.error('Detailed error in handleRemoveJob:', {
        error,
        userId: user?.uid,
        index,
        currentListings: profile?.jobListings
      });
      toast.error('Failed to remove job listing');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (!user) return;
      
      await deleteUserAccount(user.uid);
      router.push('/');
      toast.success('Account deleted successfully');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again.');
    }
  };

  const handleCompleteProfile = async () => {
    if (user) {
      try {
        // Save all current profile changes along with setting profileCompleted to true
        await updateUserProfile(user.uid, { 
          profileCompleted: true,
          linkedinUrl,
          showInMembers: profile?.showInMembers,
          status: profile?.status
        });
        
        setProfile(prev => ({
          ...prev!,
          profileCompleted: true,
          linkedinUrl
        }));
        setProfileCompleted(true);
        setHasChanges(false);
        toast.success('Profile completed and saved successfully!');
      } catch (error) {
        toast.error('Failed to update profile status');
      }
    }
  };

  if (!user || !profile) {
    return <p>Loading...</p>;
  }

  const statusOptions = [
    { key: 'lookingForCofounder', label: 'Looking for a Co-founder' },
    { key: 'needsProjectHelp', label: 'Need help with a project' },
    { key: 'offeringProjectHelp', label: 'Looking to help on projects' },
    { key: 'isHiring', label: 'Hiring' },
    { key: 'seekingJob', label: 'Looking for a job' },
    { key: 'openToNetworking', label: 'Open to networking' },
  ] as const;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <Toaster position="top-center" />
      
      {!profileCompleted && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please complete your profile to be visible in the members directory
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-end">
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Settings"
            >
              <Cog6ToothIcon className="w-6 h-6 text-gray-600" />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user.photoURL && (
            <Image
              src={user.photoURL}
              alt={user.displayName ?? ''}
              width={80}
              height={80}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold">{user.displayName}</h1>
            <p className="text-lg text-gray-600">{user.email}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label htmlFor="showInMembers" className="text-sm">
              Show me in members list
            </label>
            <input
              type="checkbox"
              id="showInMembers"
              checked={profile.showInMembers}
              onChange={handleVisibilityToggle}
              className="h-4 w-4"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">LinkedIn URL</label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => {
                setLinkedinUrl(e.target.value);
                setHasChanges(true);
              }}
              placeholder="https://linkedin.com/in/yourusername"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-medium">Status</h2>
            {statusOptions.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={key}
                  checked={profile.status[key]}
                  onChange={() => handleStatusToggle(key)}
                  className="h-4 w-4"
                />
                <label htmlFor={key} className="text-sm">
                  {label}
                </label>
              </div>
            ))}
          </div>

          {profile.isApproved && (
            <div className="mt-8">
              <button
                onClick={() => setShowJobListings(!showJobListings)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Job Listings</h2>
                  {profile.jobListings?.length ? (
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      {profile.jobListings.length}
                    </span>
                  ) : null}
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${showJobListings ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showJobListings && (
                <div className="mt-4 space-y-4">
                  {/* Existing Jobs */}
                  {profile.jobListings?.length ? (
                    <div className="space-y-3">
                      {profile.jobListings.map((job, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium truncate">{job.title}</h3>
                            <p className="text-sm text-gray-600 truncate">{job.company}</p>
                            <a 
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 text-sm"
                            >
                              View posting →
                            </a>
                          </div>
                          <button
                            onClick={() => handleRemoveJob(index)}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No job listings yet</p>
                  )}

                  {/* Add New Job Form */}
                  <div className="mt-4">
                    <button
                      onClick={() => setShowNewJobForm(true)}
                      className="text-emerald-700 hover:text-emerald-800 text-sm font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add New Job Listing
                    </button>

                    {showNewJobForm && (
                      <div className="mt-3 space-y-3">
                        <input
                          type="text"
                          placeholder="Job Title"
                          value={newJob.title}
                          onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                          className="w-full p-2 border rounded"
                        />
                        <input
                          type="text"
                          placeholder="Company"
                          value={newJob.company}
                          onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                          className="w-full p-2 border rounded"
                        />
                        <input
                          type="url"
                          placeholder="Link to Job Posting"
                          value={newJob.link}
                          onChange={(e) => setNewJob({ ...newJob, link: e.target.value })}
                          className="w-full p-2 border rounded"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddJob}
                            disabled={!newJob.title || !newJob.company || !newJob.link}
                            className="flex-1 bg-emerald-700 text-white p-2 rounded disabled:opacity-50"
                          >
                            Add Job
                          </button>
                          <button
                            onClick={() => {
                              setShowNewJobForm(false);
                              setNewJob({ title: '', company: '', link: '' });
                            }}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!profileCompleted ? (
          <button
            onClick={handleCompleteProfile}
            disabled={!linkedinUrl}
            className="w-full bg-emerald-500 text-white p-2 rounded hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes and Mark Profile as Complete
          </button>
        ) : hasChanges && (
          <button
            onClick={handleProfileUpdate}
            className="w-full bg-emerald-700 text-white p-2 rounded hover:bg-emerald-800"
          >
            Save Changes
          </button>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Delete Account</h2>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete your account? This action cannot be undone 
              and you will lose access to all your data.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

'use client';

import { auth, db } from "../firebase/firebaseConfig";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserProfile, updateShowInMembers, updateUserProfile } from "../firebase/firestoreOperations";
import { UserStatus, JobListing } from "../types";
import Image from "next/image";
import toast, { Toaster } from 'react-hot-toast';
import { doc, updateDoc } from "firebase/firestore";
import { trackEvent } from "@/utils/analytics";

interface Profile {
  showInMembers: boolean;
  linkedinUrl: string;
  status: UserStatus;
  isApproved: boolean;
  jobListings?: JobListing[];
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
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userProfile = await getUserProfile(currentUser.uid);
        setProfile(userProfile as Profile);
        setLinkedinUrl(userProfile?.linkedinUrl || "");
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleVisibilityToggle = async () => {
    if (user && profile) {
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

  const handleLinkedinUpdate = async () => {
    if (user && profile) {
      try {
        await updateUserProfile(user.uid, { linkedinUrl });
        setProfile({
          ...profile,
          linkedinUrl
        });
        toast.success('LinkedIn URL saved successfully!');
      } catch (error) {
        toast.error('Failed to save LinkedIn URL. Please try again.');
        console.error('Error updating LinkedIn URL:', error);
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
      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center gap-4 mb-6">
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
            <div className="flex gap-2">
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourusername"
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={handleLinkedinUpdate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
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
              <h2 className="text-xl font-semibold mb-4">Job Listings</h2>
              
              <div className="space-y-4 mb-6">
                {profile.jobListings?.map((job, index) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium">{job.title}</h3>
                        <p className="text-gray-600">{job.company}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveJob(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ❌
                      </button>
                    </div>
                    <a 
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View posting →
                    </a>
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
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
                <button
                  onClick={handleAddJob}
                  disabled={!newJob.title || !newJob.company || !newJob.link}
                  className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
                >
                  Add Job Listing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

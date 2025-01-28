'use client';

import { auth } from "../firebase/firebaseConfig";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserProfile, updateShowInMembers, updateUserProfile } from "../firebase/firestoreOperations";
import { UserStatus } from "../types";
import Image from "next/image";
import toast, { Toaster } from 'react-hot-toast';

interface Profile {
  showInMembers: boolean;
  linkedinUrl: string;
  status: UserStatus;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
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
        </div>
      </div>
    </main>
  );
}

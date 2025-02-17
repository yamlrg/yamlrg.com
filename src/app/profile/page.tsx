'use client';

import { auth } from "../firebase/firebaseConfig";
import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile, updateUserProfile, deleteUserAccount } from "../firebase/firestoreOperations";
import { YamlrgUserProfile } from "../types";
import Image from "next/image";
import toast, { Toaster } from 'react-hot-toast';
import { FirebaseError } from 'firebase/app';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { trackEvent } from "@/utils/analytics";
import { Menu, Transition } from '@headlessui/react';

export default function ProfilePage() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<YamlrgUserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const statusOptions = [
    { key: 'lookingForCofounder', label: 'Looking for a Co-founder' },
    { key: 'needsProjectHelp', label: 'Need help with a project' },
    { key: 'offeringProjectHelp', label: 'Looking to help on projects' },
    { key: 'isHiring', label: 'Hiring' },
    { key: 'seekingJob', label: 'Looking for a job' },
    { key: 'openToNetworking', label: 'Open to networking' },
  ] as const;

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const userProfile = await getUserProfile(user.uid);
          if (userProfile) {
            setProfile(userProfile);
            setLinkedinUrl(userProfile.linkedinUrl);
            setDisplayName(userProfile.displayName);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load profile');
        }
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setIsSaving(true);
      
      const updates = {
        linkedinUrl,
        displayName,
        profileCompleted: !!linkedinUrl,
        status: profile.status
      };

      await updateUserProfile(user.uid, updates);
      
      setProfile({ ...profile, ...updates });
      setIsEditing(false);
      toast.success('Profile updated successfully');
      
      trackEvent('profile_update', {
        linkedinUrl_provided: !!linkedinUrl,
        name_updated: displayName !== profile.displayName
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (!user) return;
      
      await deleteUserAccount(user.uid);
      await auth.signOut();
      router.push('/');
      toast.success('Account deleted successfully');
    } catch (error: unknown) {
      console.error('Error deleting account:', error);
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'permission-denied':
            toast.error('You do not have permission to delete this account');
            break;
          case 'not-found':
            toast.error('Account not found');
            break;
          default:
            toast.error(error.message);
        }
      } else {
        toast.error('Failed to delete account. Please try again.');
      }
    }
  };

  const handleLinkedinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let username = e.target.value.trim();
    
    // Remove any existing LinkedIn URL structure
    username = username.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, '');
    // Remove trailing slash if present
    username = username.replace(/\/$/, '');
    
    if (username) {
      setLinkedinUrl(`https://www.linkedin.com/in/${username}/`);
    } else {
      setLinkedinUrl('');
    }
  };

  if (!user || !profile) {
    return <p>Loading...</p>;
  }

  return (
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-end mb-4">
            <Menu as="div" className="relative">
              <Menu.Button className="text-gray-600 hover:text-gray-900">
                <Cog6ToothIcon className="w-6 h-6" />
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-1 py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setIsEditing(true)}
                          className={`${
                            active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-900'
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                        >
                          Edit Profile
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setShowDeleteConfirmation(true)}
                          className={`${
                            active ? 'bg-red-50 text-red-700' : 'text-red-600'
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                        >
                          Delete Account
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

          {/* User Info Section */}
          <div className="flex items-start gap-4 mb-6">
            {profile.photoURL ? (
              <Image
                src={profile.photoURL}
                alt={displayName}
                width={80}
                height={80}
                className="rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-2xl text-emerald-700">
                  {displayName[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-xl font-semibold p-1 border rounded mb-1"
                  placeholder="Your name"
                />
              ) : (
                <h2 className="text-xl font-semibold">{displayName}</h2>
              )}
              <p className="text-gray-600">{profile.email}</p>
            </div>
          </div>

          {/* LinkedIn URL Section */}
          <div className="mb-6">
            {isEditing ? (
              <div className="flex items-center">
                <span className="text-gray-500 mr-1">linkedin.com/in/</span>
                <input
                  type="text"
                  value={linkedinUrl.replace(/.*linkedin\.com\/in\//i, '').replace(/\/$/, '')}
                  onChange={handleLinkedinChange}
                  placeholder="username"
                  className="flex-1 p-2 border rounded"
                />
              </div>
            ) : (
              <div>
                {profile.linkedinUrl ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      View LinkedIn Profile
                    </a>
                    <span className="text-gray-500">
                      ({profile.linkedinUrl.replace(/.*linkedin\.com\/in\//i, '').replace(/\/$/, '')})
                    </span>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No LinkedIn profile added</p>
                )}
              </div>
            )}
          </div>

          {/* Status Tags Section */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Your Status</h3>
            {isEditing ? (
              <div className="space-y-2">
                {statusOptions.map(({ key, label }) => (
                  <div key={key} className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.status[key as keyof typeof profile.status]}
                        onChange={() => {
                          setProfile({
                            ...profile,
                            status: {
                              ...profile.status,
                              [key]: !profile.status[key as keyof typeof profile.status]
                            }
                          });
                        }}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{label}</span>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {statusOptions
                  .filter(({ key }) => profile.status[key as keyof typeof profile.status])
                  .map(({ key, label }) => (
                    <span
                      key={key}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                    >
                      {label}
                    </span>
                  ))}
                {!Object.values(profile.status).some(Boolean) && (
                  <p className="text-gray-500 italic text-sm">No status set</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 text-emerald-600 hover:text-emerald-700"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-400"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Account</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteAccount();
                  setShowDeleteConfirmation(false);
                }}
                className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

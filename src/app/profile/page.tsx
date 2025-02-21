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
import { FaLinkedin } from 'react-icons/fa';

const MAX_DISPLAY_NAME_LENGTH = 50;

export default function ProfilePage() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<YamlrgUserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showInMembers, setShowInMembers] = useState(false);
  const [nameError, setNameError] = useState('');
  const [showEmail, setShowEmail] = useState(true);

  const statusOptions = [
    { key: 'lookingForCofounder', label: 'Looking for a Co-founder', color: 'bg-emerald-100 text-emerald-800' },
    { key: 'needsProjectHelp', label: 'Need help with a project', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'offeringProjectHelp', label: 'Looking to help on projects', color: 'bg-teal-100 text-teal-800' },
    { key: 'isHiring', label: 'Hiring', color: 'bg-blue-100 text-blue-800' },
    { key: 'seekingJob', label: 'Looking for a job', color: 'bg-pink-100 text-pink-800' },
    { key: 'openToNetworking', label: 'Open to networking', color: 'bg-purple-100 text-purple-800' },
  ] as const;

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const userProfile = await getUserProfile(user.uid);
          if (userProfile) {
            setProfile(userProfile);
            setLinkedinUrl(userProfile.linkedinUrl ?? '');
            setDisplayName(userProfile.displayName || user.email?.split('@')[0] || 'User');
            setShowInMembers(userProfile.showInMembers ?? true);
            setShowEmail(userProfile.showEmail ?? true);
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

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setNameError('Name cannot be empty');
      return;
    }

    if (trimmedName.length > MAX_DISPLAY_NAME_LENGTH) {
      toast.error(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`);
      return;
    }

    try {
      setIsSaving(true);
      
      const updates = {
        linkedinUrl,
        displayName: trimmedName,
        profileCompleted: !!linkedinUrl,
        status: profile.status,
        showInMembers,
        showEmail,
      };

      await updateUserProfile(user.uid, updates);
      
      setProfile({ ...profile, ...updates });
      setIsEditing(false);
      setNameError('');
      toast.success('Profile updated successfully');
      
      trackEvent('profile_update', {
        linkedinUrl_provided: !!linkedinUrl,
        name_updated: trimmedName !== profile.displayName
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
          {/* Settings Menu */}
          <div className="flex justify-end mb-6">
            <Menu as="div" className="relative">
              <Menu.Button className="text-gray-400 hover:text-gray-600 transition-colors">
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
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
          <div className="flex items-start gap-6 mb-8">
            {profile.photoURL ? (
              <Image
                src={profile.photoURL}
                alt={displayName}
                width={96}
                height={96}
                className="rounded-full"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-3xl text-emerald-700">
                  {displayName[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-grow">
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setNameError('');
                    }}
                    maxLength={MAX_DISPLAY_NAME_LENGTH}
                    className={`text-2xl font-bold p-1 border rounded mb-2 w-full ${
                      nameError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Your name"
                  />
                  {nameError && (
                    <p className="text-red-500 text-sm mt-1">{nameError}</p>
                  )}
                  {displayName.length > 0 && (
                    <p className={`text-sm mt-1 ${
                      displayName.length > MAX_DISPLAY_NAME_LENGTH ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {displayName.length}/{MAX_DISPLAY_NAME_LENGTH} characters
                    </p>
                  )}
                </div>
              ) : (
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{displayName}</h2>
              )}
              <p className="text-gray-600">{profile.email}</p>
            </div>
          </div>

          {/* LinkedIn Section */}
          <div className="mb-8">
            {isEditing ? (
              <div className="flex items-center bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 mr-2">linkedin.com/in/</span>
                <input
                  type="text"
                  value={linkedinUrl.replace(/.*linkedin\.com\/in\//i, '').replace(/\/$/, '')}
                  onChange={handleLinkedinChange}
                  placeholder="username"
                  className="flex-1 p-2 border rounded bg-white"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <FaLinkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="mb-8">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    showInMembers 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      showInMembers ? 'bg-emerald-500' : 'bg-gray-500'
                    }`} />
                    {showInMembers ? 'Profile visible in members directory' : 'Profile hidden from members directory'}
                  </span>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    showEmail 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      showEmail ? 'bg-emerald-500' : 'bg-gray-500'
                    }`} />
                    {showEmail ? 'Email visible to members' : 'Email hidden from members'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Tags Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3">Your Status</h3>
            {isEditing ? (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
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
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-3"
                      />
                      <span className="text-gray-700">{label}</span>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {statusOptions
                  .filter(({ key }) => profile.status[key as keyof typeof profile.status])
                  .map(({ key, label, color }) => (
                    <span
                      key={key}
                      className={`px-3 py-1 rounded-full text-sm ${color}`}
                    >
                      {label}
                    </span>
                  ))}
                {!Object.values(profile.status).some(Boolean) && (
                  <p className="text-gray-500 italic">No status set</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !displayName.trim()}
                className="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {isEditing && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInMembers}
                    onChange={() => setShowInMembers(!showInMembers)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-gray-700">Show my profile in members directory</span>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEmail}
                    onChange={() => setShowEmail(!showEmail)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-gray-700">Show my email to other members</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
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

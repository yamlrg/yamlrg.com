'use client';

import { auth } from "../firebase/firebaseConfig";
import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile, updateUserProfile, deleteUserAccount } from "../firebase/firestoreOperations";
import { YamlrgUserProfile, CompanyInfo } from "../types";
import Image from "next/image";
import toast, { Toaster } from 'react-hot-toast';
import { FirebaseError } from 'firebase/app';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { trackEvent } from "@/utils/analytics";
import { Menu, Transition } from '@headlessui/react';
import { FaLinkedin, FaWhatsapp, FaTelegram, FaDiscord, FaSignal } from 'react-icons/fa';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { CONTACT_OPTIONS } from '@/constants/contact';
import { formatLinkedInUrl } from '@/utils/linkedin';

const STAGE_LABELS = {
  'idea': 'Idea Stage',
  'pre-seed': 'Pre-seed',
  'seed': 'Seed',
  'series-a': 'Series A',
  'scaling': 'Scaling',
  'enterprise': 'Enterprise',
  'none': 'Not Applicable'
} as const;

const MAX_DISPLAY_NAME_LENGTH = 50;

interface ContactValue {
  id: string;
  value: string;
}

// Add this helper function to convert contact methods to the correct type
const convertToContactValues = (
  contactMethods: Array<string | { id: string; value: string; }>
): ContactValue[] => {
  return contactMethods
    .map(contact => {
      if (typeof contact === 'string') {
        return { id: contact.toLowerCase(), value: '' };
      }
      if (contact && typeof contact === 'object' && 'id' in contact) {
        return contact as ContactValue;
      }
      return null;
    })
    .filter((contact): contact is ContactValue => contact !== null);
};

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
  const [company, setCompany] = useState<CompanyInfo>({
    name: '',
    stage: 'none',
    website: '',
    industry: '',
  });
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState({
    cofounder: false,
    wannabeFounders: false,
    investors: false,
    customers: false,
    hiring: false,
    fundraising: false,
    partnerships: false,
    advice: false
  });
  const [bestWayToReach, setBestWayToReach] = useState<ContactValue[]>([]);
  const [isInvestor, setIsInvestor] = useState(false);

  const statusOptions = [
    { key: 'needsProjectHelp', label: 'Need help with a project', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'offeringProjectHelp', label: 'Looking to help on projects', color: 'bg-teal-100 text-teal-800' },
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
            setCompany(userProfile.company ?? {
              name: '',
              stage: 'none',
              website: '',
              industry: '',
            });
            setRole(userProfile.role ?? '');
            setLocation(userProfile.location ?? '');
            setTimezone(userProfile.timezone ?? '');
            setInterests(userProfile.interests ?? []);
            const defaultLookingFor = {
              cofounder: false,
              wannabeFounders: false,
              investors: false,
              customers: false,
              hiring: false,
              fundraising: false,
              partnerships: false,
              advice: false
            };
            setLookingFor({
              ...defaultLookingFor,
              ...(userProfile.lookingFor || {})
            });
            // Ensure consistent handling of bestWayToReach
            const contactMethods = userProfile.bestWayToReach || [];
            setBestWayToReach(
              Array.isArray(contactMethods) 
                ? convertToContactValues(contactMethods)
                : []
            );
            setIsInvestor(userProfile.isInvestor ?? false);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load profile');
        }
      }
    };

    fetchProfile();
  }, [user]);

  // Monitor lookingFor changes
  useEffect(() => {
    console.log('Looking For state updated:', lookingFor);
  }, [lookingFor]);

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

    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, {
        ...profile,
        displayName: trimmedName,
        linkedinUrl,
        showInMembers,
        showEmail,
        company,
        role,
        location,
        timezone,
        interests,
        lookingFor,
        bestWayToReach,
        isInvestor,
      });
      
      // Track profile update
      trackEvent('profile_updated');

      setProfile(prev => prev ? {
        ...prev,
        displayName: trimmedName,
        linkedinUrl,
        showInMembers,
        showEmail,
        company,
        role,
        location,
        timezone,
        interests,
        lookingFor,
        bestWayToReach,
        isInvestor,
      } : null);

      setIsEditing(false);
      setNameError('');
      toast.success('Profile updated!');
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
    const value = e.target.value.trim();
    setLinkedinUrl(value ? formatLinkedInUrl(value, true) : '');
  };

  const getIndustryTags = (industry: string | undefined) => {
    if (!industry) return [];
    return industry
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  };

  if (!user || !profile) {
    return <p>Loading...</p>;
  }

  return (
    <main className="min-h-screen p-4" key={user.uid}>
      <Toaster position="top-center" />
      <div className="max-w-3xl mx-auto">
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

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div>
              {/* LinkedIn Section */}
              <div className="mb-6">
                {isEditing ? (
                  <div className="flex items-center bg-gray-50 rounded-lg p-3 overflow-hidden">
                    <span className="text-gray-500 mr-2">linkedin.com/in/</span>
                    <input
                      type="text"
                      value={linkedinUrl.replace(/.*linkedin\.com\/in\//i, '').replace(/\/$/, '')}
                      onChange={handleLinkedinChange}
                      placeholder="username"
                      className="w-full p-2 border rounded bg-white"
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
                <div className="mb-6">
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
              <div className="mb-6">
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

              {/* Company Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Company & Role</h3>
                {isEditing ? (
                  <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                    <input
                      type="text"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      className="w-full p-2 border rounded"
                      placeholder="Company name"
                    />
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-2 border rounded"
                      placeholder="Your role"
                    />
                    <input
                      type="url"
                      value={company.website}
                      onChange={(e) => setCompany({ ...company, website: e.target.value })}
                      className="w-full p-2 border rounded"
                      placeholder="https://..."
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Location"
                      />
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Timezone"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Add industry tags (press Enter to add)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            const currentTags = getIndustryTags(company.industry);
                            if (value && !currentTags.includes(value)) {
                              setCompany({ 
                                ...company, 
                                industry: [...currentTags, value].join(', ')
                              });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        className="w-full p-2 border rounded mb-2"
                      />
                      <div className="flex flex-wrap gap-2">
                        {getIndustryTags(company.industry).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                          >
                            {tag}
                            <button
                              onClick={() => {
                                const tags = getIndustryTags(company.industry);
                                setCompany({
                                  ...company,
                                  industry: tags.filter((_, i) => i !== index).join(', ')
                                });
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <select
                      value={company.stage}
                      onChange={(e) => setCompany({ 
                        ...company, 
                        stage: e.target.value as CompanyInfo['stage']
                      })}
                      className="w-full p-2 border rounded"
                    >
                      {Object.entries(STAGE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : company.website ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {company.name}
                    </a>
                    {role && <p className="text-gray-600 mt-1">{role}</p>}
                    {(location || timezone) && (
                      <p className="text-gray-500 text-sm mt-1">
                        {location}
                        {location && timezone && ' · '}
                        {timezone}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {company.industry && getIndustryTags(company.industry).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                      {company.stage !== 'none' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {STAGE_LABELS[company.stage]}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">{company.name}</p>
                    {role && <p className="text-gray-600 mt-1">{role}</p>}
                    {(location || timezone) && (
                      <p className="text-gray-500 text-sm mt-1">
                        {location}
                        {location && timezone && ' · '}
                        {timezone}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {company.industry && getIndustryTags(company.industry).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                      {company.stage !== 'none' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {STAGE_LABELS[company.stage]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Looking For */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Looking For</h3>
                {isEditing ? (
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    {/* Debug output */}
                    {/* {console.log('Available options:', Object.keys(lookingFor))} */}
                    {Object.entries(lookingFor).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => setLookingFor(prev => ({
                            ...prev,
                            [key]: !value
                          }))}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-3"
                        />
                        <span className="text-gray-700">
                          {key === 'cofounder' ? 'Co-founder' :
                           key === 'wannabeFounders' ? 'Wannabe Founders' :
                           key === 'investors' ? 'Investors' :
                           key === 'hiring' ? 'Hiring' :
                           key === 'customers' ? 'Customers' :
                           key === 'fundraising' ? 'Fundraising' :
                           key === 'partnerships' ? 'Partnerships' :
                           key === 'advice' ? 'Advice' :
                           key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : Object.values(lookingFor).some(Boolean) && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(lookingFor).map(([key, value]) => 
                      value && (
                        <span
                          key={key}
                          className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm"
                        >
                          {key === 'cofounder' ? 'Co-founder' :
                           key === 'wannabeFounders' ? 'Wannabe Founders' :
                           key === 'investors' ? 'Investors' :
                           key === 'hiring' ? 'Hiring' :
                           key === 'customers' ? 'Customers' :
                           key === 'fundraising' ? 'Fundraising' :
                           key === 'partnerships' ? 'Partnerships' :
                           key === 'advice' ? 'Advice' :
                           key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Interests */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Interests</h3>
                {isEditing ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <input
                      type="text"
                      placeholder="Add interests (press Enter to add)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim();
                          if (value && !interests.includes(value)) {
                            setInterests([...interests, value]);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      className="w-full p-2 border rounded mb-2"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-200 rounded-full text-sm flex items-center gap-1"
                        >
                          {interest}
                          <button
                            onClick={() => setInterests(interests.filter((_, i) => i !== index))}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Best Way to Reach */}
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-medium">Best Way to Reach</h3>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_OPTIONS.map(option => {
                    const existingContact = bestWayToReach.find(
                      contact => typeof contact === 'object' && contact.id === option.id
                    );

                    // If not editing, only show contacts that have values
                    if (!isEditing && !existingContact) return null;

                    return (
                      <div key={option.id} className="flex items-center gap-2">
                        {existingContact ? (
                          // Show value with remove option when editing
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
                            {option.id === 'whatsapp' && <FaWhatsapp className="text-green-500" />}
                            {option.id === 'telegram' && <FaTelegram className="text-blue-500" />}
                            {option.id === 'discord' && <FaDiscord className="text-indigo-500" />}
                            {option.id === 'signal' && <FaSignal className="text-blue-500" />}
                            {option.id === 'other' && <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500" />}
                            <span>{existingContact.value}</span>
                            {isEditing && (
                              <button
                                onClick={() => setBestWayToReach(prev => 
                                  prev.filter(contact => 
                                    !(typeof contact === 'object' && contact.id === option.id)
                                  )
                                )}
                                className="ml-2 text-red-400 hover:text-red-600"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ) : isEditing ? (
                          // Show add button only in edit mode
                          <button
                            onClick={() => {
                              const promptMessage = 
                                option.id === 'discord' ? 'Enter your Discord username:' :
                                option.id === 'telegram' ? 'Enter your Telegram username:' :
                                option.id === 'signal' ? 'Enter your Signal number:' :
                                option.id === 'other' ? 'Enter your preferred contact method:' :
                                'Enter your contact info:';

                              const value = prompt(promptMessage);
                              if (value) {
                                setBestWayToReach(prev => [
                                  ...prev.filter(contact => 
                                    !(typeof contact === 'object' && contact.id === option.id)
                                  ),
                                  { id: option.id, value }
                                ]);
                              }
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full"
                          >
                            {option.id === 'whatsapp' && <FaWhatsapp className="text-green-500" />}
                            {option.id === 'telegram' && <FaTelegram className="text-blue-500" />}
                            {option.id === 'discord' && <FaDiscord className="text-indigo-500" />}
                            {option.id === 'signal' && <FaSignal className="text-blue-500" />}
                            {option.id === 'other' && <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500" />}
                            <span>Add {option.label}</span>
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Investor Toggle */}
              {isEditing ? (
                <div className="mb-6 pt-6 border-t">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isInvestor}
                      onChange={() => setIsInvestor(!isInvestor)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-gray-700">I am an investor</span>
                  </label>
                </div>
              ) : isInvestor && (
                <div className="mb-6 mt-6">
                  <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    Investor
                  </span>
                </div>
              )}
            </div>
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

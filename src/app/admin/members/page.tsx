'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, removeUserApproval, updateUserVisibility, updateUserProfile, deleteUserAccount, deleteJoinRequest } from '@/app/firebase/firestoreOperations';
import { YamlrgUserProfile } from '@/app/types';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon, EyeIcon, MagnifyingGlassIcon, PencilIcon, PlusIcon, MinusIcon, StarIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FaLinkedin } from 'react-icons/fa';
import Image from 'next/image';
import { ADMIN_EMAILS } from '@/app/config/admin';
import PointsModal from '@/components/PointsModal';
import PointsHistoryModal from '@/components/PointsHistoryModal';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import { POINTS_SYSTEM, PointCategory } from '@/app/config/points';
import { formatLinkedInUrl } from '@/utils/linkedin';
import { saveAs } from 'file-saver';
import AdminProtectedPage from "@/components/AdminProtectedPage";

interface GradientConnectEvent {
  id: string;
  date: string;
  status: 'upcoming' | 'completed';
}

const downloadEmails = (users: YamlrgUserProfile[]) => {
  try {
    // Create text content with emails separated by commas
    const emailContent = users
      .map(user => user.email)
      .filter(Boolean)
      .join(',\n');

    // Create and download the file
    const blob = new Blob([emailContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'yamlrg-member-emails.txt');
    
    toast.success('Emails downloaded successfully');
  } catch (error) {
    console.error('Error downloading emails:', error);
    toast.error('Failed to download emails');
  }
};

export default function MembersPage() {
  const [users, setUsers] = useState<YamlrgUserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    profileStatus: 'all', // 'all', 'complete', 'incomplete'
    visibility: 'all', // 'all', 'visible', 'hidden'
  });
  const [pointsModal, setPointsModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'remove';
    userId: string;
  }>({
    isOpen: false,
    mode: 'add',
    userId: ''
  });
  const [pointsHistoryModal, setPointsHistoryModal] = useState<{
    isOpen: boolean;
    user: YamlrgUserProfile | null;
  }>({
    isOpen: false,
    user: null
  });
  const [selectedReason, setSelectedReason] = useState('');
  const [upcomingEvent, setUpcomingEvent] = useState<GradientConnectEvent | null>(null);
  const [gradientConnectSignups, setGradientConnectSignups] = useState<Set<string>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    user: YamlrgUserProfile | null;
  }>({
    isOpen: false,
    user: null
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchUpcomingEvent = async () => {
      try {
        const eventsRef = collection(db, 'gradientConnectEvents');
        const eventsSnapshot = await getDocs(eventsRef);

        // Get the nearest upcoming event
        const events = eventsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as GradientConnectEvent))
          .filter(event => event.status === 'upcoming')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (events.length > 0) {
          const nextEvent = events[0];
          setUpcomingEvent(nextEvent);

          // Fetch all signups for this event
          const signupsRef = collection(db, 'gradientConnectSignups');
          const signupQuery = query(
            signupsRef,
            where('matchingDate', '==', nextEvent.date)
          );
          
          const signupSnapshot = await getDocs(signupQuery);
          const signedUpUserIds = new Set(
            signupSnapshot.docs.map(doc => doc.data().userId)
          );
          setGradientConnectSignups(signedUpUserIds);
        }
      } catch (error) {
        console.error('Error fetching upcoming event:', error);
      }
    };

    fetchUpcomingEvent();
  }, []);

  const handleRemoveApproval = async (userId: string) => {
    try {
      await removeUserApproval(userId);
      toast.success('Approval removed successfully');
      
      // Refresh users
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Error removing approval:', error);
      toast.error('Failed to remove approval');
    }
  };

  const toggleUserVisibility = async (user: YamlrgUserProfile) => {
    try {
      const newVisibility = !user.showInMembers;
      await updateUserVisibility(user.uid, newVisibility);
      toast.success(`User is now ${newVisibility ? 'visible' : 'hidden'}`);
      
      // Refresh users
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const handleEditName = async (user: YamlrgUserProfile, setUsers: React.Dispatch<React.SetStateAction<YamlrgUserProfile[]>>) => {
    const newName = prompt('Enter new display name:', user.displayName);
    if (newName === null) return;
    
    if (newName.trim().length > 50) {
      toast.error('Name must be 50 characters or less');
      return;
    }

    try {
      await updateUserProfile(user.uid, {
        displayName: newName.trim()
      });
      
      // Refresh users list
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      toast.success('Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    }
  };

  const isUserAdmin = (email: string | null) => {
    return email && ADMIN_EMAILS.includes(email);
  };

  const handlePointsUpdate = async (points: number, reason: string) => {
    try {
      const user = users.find(u => u.uid === pointsModal.userId);
      if (!user) return;

      // Get the current user data to ensure we have the latest state
      const userRef = doc(db, 'users', pointsModal.userId);
      const userSnap = await getDoc(userRef);
      const currentUserData = userSnap.data() as YamlrgUserProfile;

      const [category, action] = reason.split('.') as [PointCategory, string];
      if (!category || !action || !POINTS_SYSTEM[category]?.[action]) {
        throw new Error('Invalid points reason');
      }

      const pointsToAdd = POINTS_SYSTEM[category][action].value;
      const newTotal = (currentUserData.points || 0) + (pointsModal.mode === 'add' ? pointsToAdd : -pointsToAdd);

      const newHistory = [
        ...(currentUserData.pointsHistory || []),
        {
          timestamp: new Date().toISOString(),
          action: POINTS_SYSTEM[category][action].label,
          points: pointsModal.mode === 'add' ? pointsToAdd : -pointsToAdd,
          total: newTotal
        }
      ];

      // Update both points and pointsHistory atomically
      await updateDoc(userRef, {
        points: newTotal,
        pointsHistory: newHistory
      });

      // Refresh users list
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      toast.success(`Points ${pointsModal.mode === 'add' ? 'added' : 'removed'} successfully`);
      setPointsModal({ isOpen: false, mode: 'add', userId: '' });
      setSelectedReason('');
    } catch (error) {
      console.error('Error updating points:', error);
      toast.error('Failed to update points');
    }
  };

  const handleReasonChange = (value: string) => {
    const [category, action] = value.split('.') as [PointCategory, string];
    if (category && action && POINTS_SYSTEM[category]?.[action]) {
      setSelectedReason(value);
    }
  };

  const handleGradientConnectSignup = async (user: YamlrgUserProfile) => {
    if (!upcomingEvent) {
      toast.error('No upcoming Gradient Connect event found');
      return;
    }

    try {
      const signupsRef = collection(db, 'gradientConnectSignups');
      
      // Check if already signed up
      const existingQuery = query(
        signupsRef,
        where('userId', '==', user.uid),
        where('matchingDate', '==', upcomingEvent.date)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        toast.error('Member is already signed up for this event');
        return;
      }

      // Create new signup
      await addDoc(signupsRef, {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        matchingDate: upcomingEvent.date,
        status: {
          inviteSent: false,
          inviteAccepted: false,
          matched: false,
          matchedWith: null,
          matchedWithName: null
        },
        createdAt: new Date().toISOString()
      });

      // Update local state
      setGradientConnectSignups(prev => new Set([...prev, user.uid]));
      toast.success('Member signed up for Gradient Connect successfully');
    } catch (error) {
      console.error('Error signing up for Gradient Connect:', error);
      toast.error('Failed to sign up for Gradient Connect');
    }
  };

  const handleDeleteUser = async (user: YamlrgUserProfile) => {
    try {
      // First, try to find and delete the join request
      const requestsRef = collection(db, 'joinRequests');
      const q = query(requestsRef, where('email', '==', user.email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      // Delete all matching join requests
      const deletePromises = querySnapshot.docs.map(doc => deleteJoinRequest(doc.id));
      await Promise.all(deletePromises);
      
      // Then delete the user account
      await deleteUserAccount(user.uid);
      
      toast.success('User and join request deleted successfully');
      
      // Refresh users list
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesProfileStatus = 
      filters.profileStatus === 'all' ||
      (filters.profileStatus === 'complete' && user.profileCompleted) ||
      (filters.profileStatus === 'incomplete' && !user.profileCompleted);

    const matchesVisibility =
      filters.visibility === 'all' ||
      (filters.visibility === 'visible' && user.showInMembers) ||
      (filters.visibility === 'hidden' && !user.showInMembers);

    return matchesSearch && matchesProfileStatus && matchesVisibility;
  });

  return (
    <AdminProtectedPage>
      <main className="min-h-screen p-4">
        <Toaster position="top-center" />
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link 
              href="/admin"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold">Members</h1>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.profileStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, profileStatus: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Profiles</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </select>
              
              <select
                value={filters.visibility}
                onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Visibility</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <button
              onClick={() => downloadEmails(users)}
              className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Member Emails
            </button>
          </div>

          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No members found</p>
            ) : (
              filteredUsers.map((user) => (
                <div 
                  key={user.uid} 
                  className="bg-white rounded-lg shadow p-4 relative"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteConfirmation({ isOpen: true, user })}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete user"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>

                  {/* User Header */}
                  <div className="flex items-start gap-3 mb-3 relative">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || ''}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg text-emerald-700">
                          {(user.displayName || user.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {user.displayName || 'No name'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                    {user.linkedinUrl && (
                      <a 
                        href={formatLinkedInUrl(user.linkedinUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-0 right-0 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <FaLinkedin className="w-5 h-5" />
                      </a>
                    )}
                  </div>

                  {/* Status Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.profileCompleted 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.profileCompleted ? 'Profile Complete' : 'Profile Incomplete'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.showInMembers 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.showInMembers ? 'Visible' : 'Hidden'}
                    </span>
                    {upcomingEvent && gradientConnectSignups.has(user.uid) && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Signed up for Gradient Connect
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-2">
                    {isUserAdmin(user.email) ? (
                      <span className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Admin
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditName(user, setUsers)}
                          className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                          title="Edit name"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleUserVisibility(user)}
                          className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRemoveApproval(user.uid)}
                          className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-full hover:bg-red-100"
                        >
                          Remove Approval
                        </button>
                      </>
                    )}
                  </div>

                  {/* Add points display and controls in the user card */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <button 
                      onClick={() => setPointsHistoryModal({ isOpen: true, user })}
                      className="flex items-center gap-1 hover:text-emerald-600"
                    >
                      <StarIcon className="w-4 h-4 text-yellow-400" />
                      <span className="font-medium">{user.points || 0}</span>
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => setPointsModal({ isOpen: true, mode: 'add', userId: user.uid })}
                      className="p-1 text-gray-600 hover:text-emerald-600 rounded-full hover:bg-gray-100"
                      title="Add points"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPointsModal({ isOpen: true, mode: 'remove', userId: user.uid })}
                      className="p-1 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                      title="Remove points"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Gradient Connect Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setPointsHistoryModal({ isOpen: true, user })}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Points History
                    </button>
                    <button
                      onClick={() => setPointsModal({ isOpen: true, mode: 'add', userId: user.uid })}
                      className="text-sm text-emerald-600 hover:text-emerald-800"
                    >
                      Add Points
                    </button>
                    <button
                      onClick={() => setPointsModal({ isOpen: true, mode: 'remove', userId: user.uid })}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove Points
                    </button>
                    <button
                      onClick={() => toggleUserVisibility(user)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      {user.showInMembers ? 'Hide' : 'Show'}
                    </button>
                    {user.isApproved && (
                      <button
                        onClick={() => handleRemoveApproval(user.uid)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove Approval
                      </button>
                    )}
                    {upcomingEvent && !gradientConnectSignups.has(user.uid) && (
                      <button
                        onClick={() => handleGradientConnectSignup(user)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Add to Gradient Connect
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add the modal */}
        <PointsModal
          isOpen={pointsModal.isOpen}
          mode={pointsModal.mode}
          onClose={() => {
            setPointsModal({ isOpen: false, mode: 'add', userId: '' });
            setSelectedReason('');
          }}
          onSubmit={handlePointsUpdate}
        >
          <select 
            value={selectedReason}
            onChange={(e) => handleReasonChange(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="">Select reason</option>
            {Object.entries(POINTS_SYSTEM).map(([category, actions]) => (
              <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                {Object.entries(actions).map(([key, { label, value }]) => (
                  <option key={`${category}.${key}`} value={`${category}.${key}`}>
                    {label} ({value} points)
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </PointsModal>

        {/* Add the points history modal */}
        {pointsHistoryModal.user && (
          <PointsHistoryModal
            isOpen={pointsHistoryModal.isOpen}
            onClose={() => setPointsHistoryModal({ isOpen: false, user: null })}
            user={pointsHistoryModal.user}
            onUpdate={async () => {
              const updatedUsers = await getAllUsers();
              setUsers(updatedUsers);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmation.isOpen && deleteConfirmation.user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Delete User</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {deleteConfirmation.user.displayName || deleteConfirmation.user.email}? 
                This will also delete their join request and cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setDeleteConfirmation({ isOpen: false, user: null })}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirmation.user) {
                      handleDeleteUser(deleteConfirmation.user);
                      setDeleteConfirmation({ isOpen: false, user: null });
                    }
                  }}
                  className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminProtectedPage>
  );
} 
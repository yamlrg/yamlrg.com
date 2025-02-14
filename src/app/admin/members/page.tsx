'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, removeUserApproval, updateUserVisibility } from '@/app/firebase/firestoreOperations';
import { ExtendedUser } from '@/app/types';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon, EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function MembersPage() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    profileStatus: 'all', // 'all', 'complete', 'incomplete'
    visibility: 'all', // 'all', 'visible', 'hidden'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers as ExtendedUser[]);
    };

    fetchUsers();
  }, []);

  const handleRemoveApproval = async (userId: string) => {
    try {
      await removeUserApproval(userId);
      toast.success('Approval removed successfully');
      
      // Refresh users
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers as ExtendedUser[]);
    } catch (error) {
      console.error('Error removing approval:', error);
      toast.error('Failed to remove approval');
    }
  };

  const toggleUserVisibility = async (user: ExtendedUser) => {
    try {
      const newVisibility = !user.showInMembers;
      await updateUserVisibility(user.uid, newVisibility);
      toast.success(`User is now ${newVisibility ? 'visible' : 'hidden'}`);
      
      // Refresh users
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers as ExtendedUser[]);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const isUserAdmin = (email: string | null) => {
    return email && ['callum.delsol@gmail.com', 'mariaypabloluquea@gmail.com'].includes(email);
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
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-md mx-auto">
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
        </div>

        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No members found</p>
          ) : (
            filteredUsers.map((user) => (
              <div 
                key={user.uid} 
                className="bg-white rounded-lg shadow p-4"
              >
                {/* User Header */}
                <div className="flex items-start gap-3 mb-3">
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
                </div>

                {/* LinkedIn Link */}
                {user.linkedinUrl && (
                  <a 
                    href={user.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 hover:text-emerald-700 block mb-3"
                  >
                    LinkedIn Profile
                  </a>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-2">
                  {isUserAdmin(user.email) ? (
                    <span className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                      Admin
                    </span>
                  ) : (
                    <>
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
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
} 
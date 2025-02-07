'use client';

import { useState, useEffect } from 'react';
import { getAllUsers } from '@/app/firebase/firestoreOperations';
import { ExtendedUser } from '@/app/types';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function MembersPage() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers as ExtendedUser[]);
    };

    fetchUsers();
  }, []);

  const handleRemoveApproval = async (userId: string) => {
    try {
      // Add your remove approval logic here
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
      // Add your visibility toggle logic here
      toast.success(`User is now ${user.showInMembers ? 'hidden' : 'visible'}`);
      // Refresh users
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers as ExtendedUser[]);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

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

        <div className="space-y-4">
          {users.map((user) => (
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
} 
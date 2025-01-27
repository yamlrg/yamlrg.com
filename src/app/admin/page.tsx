'use client';

import { useEffect, useState } from 'react';
import { getAllUsers, approveUser, removeApproval, updateShowInMembers } from '../firebase/firestoreOperations';
import { ExtendedUser } from '../types';
import { useRouter } from 'next/navigation';
import { auth } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import { ADMIN_EMAILS } from '../config/admin';

export default function AdminPage() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email || '')) {
        router.push('/');
        toast.error('Unauthorized access');
        return;
      }
      setIsAdmin(true);
      fetchUsers();
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      // Filter out admin users from the list
      const nonAdminUsers = allUsers.filter(user => 
        !ADMIN_EMAILS.includes(user.email || '')
      ) as ExtendedUser[];
      setUsers(nonAdminUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleApproval = async (userId: string, currentApprovalStatus: boolean) => {
    try {
      if (currentApprovalStatus) {
        await removeApproval(userId);
        toast.success('Member approval removed');
      } else {
        await approveUser(userId);
        toast.success('Member approved');
      }
      await fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error('Failed to update member status');
    }
  };

  const handleVisibility = async (userId: string, currentVisibility: boolean) => {
    try {
      await updateShowInMembers(userId, !currentVisibility);
      toast.success(currentVisibility ? 'Member hidden from directory' : 'Member visible in directory');
      await fetchUsers();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  if (!isAdmin) {
    return <div>Loading...</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid gap-4">
        {users.map((user) => (
          <div key={user.uid} className="border p-4 rounded-lg flex items-center justify-between bg-white shadow-sm">
            <div className="flex items-center gap-4">
              {user.photoURL && (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || ''}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              <div>
                <h2 className="font-semibold">{user.displayName}</h2>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-600">
                  Status: {user.isApproved ? 'Approved' : 'Not Approved'}
                </p>
                {user.approvedAt && (
                  <p className="text-xs text-gray-500">
                    Approved on: {new Date(user.approvedAt).toLocaleDateString()}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Visibility: {user.showInMembers ? 'Visible in directory' : 'Hidden from directory'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleVisibility(user.uid, user.showInMembers)}
                className={`px-4 py-2 rounded ${
                  user.showInMembers
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {user.showInMembers ? 'Hide' : 'Show'}
              </button>
              
              <button
                onClick={() => handleApproval(user.uid, user.isApproved)}
                className={`px-4 py-2 rounded ${
                  user.isApproved
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
              >
                {user.isApproved ? 'Remove Approval' : 'Approve'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
} 
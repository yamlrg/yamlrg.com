'use client';

import { useEffect, useState } from 'react';
import { getAllUsers, approveUser, removeApproval, updateShowInMembers, getJoinRequests, updateJoinRequestStatus, updateUserProfile, getPresentationRequests, updatePresentationRequestStatus, getWorkshops, deleteWorkshop } from '../firebase/firestoreOperations';
import { ExtendedUser, JoinRequest, Workshop, PresentationRequest } from '../types';
import { useRouter } from 'next/navigation';
import { auth } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import { ADMIN_EMAILS } from '../config/admin';
import { trackEvent } from "@/utils/analytics";
import Link from 'next/link';

type SortOption = 'name' | 'approval' | 'date';

export default function AdminPage() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('approval');
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'workshops'>('users');
  const [showRecentApproved, setShowRecentApproved] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [presentationRequests, setPresentationRequests] = useState<PresentationRequest[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
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

  useEffect(() => {
    const fetchData = async () => {
      if (isAdmin) {
        const [allUsers, allRequests, allPresentationRequests, allWorkshops] = await Promise.all([
          getAllUsers(),
          getJoinRequests(),
          getPresentationRequests(),
          getWorkshops()
        ]);
        setUsers(allUsers as ExtendedUser[]);
        setRequests(allRequests);
        setPresentationRequests(allPresentationRequests);
        setWorkshops(allWorkshops);
      }
    };
    fetchData();
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers as ExtendedUser[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const sortUsers = (users: ExtendedUser[]) => {
    // First separate admins and non-admins
    const adminUsers = users.filter(user => ADMIN_EMAILS.includes(user.email ?? ''));
    const nonAdminUsers = users.filter(user => !ADMIN_EMAILS.includes(user.email ?? ''));

    // Sort admins by name
    adminUsers.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));

    // Sort non-admin users based on selected criteria
    switch (sortBy) {
      case 'name':
        nonAdminUsers.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
        break;
      case 'approval':
        nonAdminUsers.sort((a, b) => {
          if (a.isApproved !== b.isApproved) {
            // Put unapproved users first
            return a.isApproved ? 1 : -1;
          }
          // If approval status is the same, sort by name
          return (a.displayName ?? '').localeCompare(b.displayName ?? '');
        });
        break;
      case 'date':
        nonAdminUsers.sort((a, b) => {
          if (!a.approvedAt && !b.approvedAt) return 0;
          if (!a.approvedAt) return 1;
          if (!b.approvedAt) return -1;
          return new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime();
        });
        break;
    }

    return { adminUsers, nonAdminUsers };
  };

  const { adminUsers, nonAdminUsers } = sortUsers(users);

  // Filter requests
  const pendingRequests = requests.filter(request => request.status === 'pending');
  const allRequests = requests.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleApproval = async (userId: string, currentApprovalStatus: boolean) => {
    try {
      if (currentApprovalStatus) {
        await removeApproval(userId);
        trackEvent('member_approval_removed', { user_id: userId });
      } else {
        await approveUser(userId);
        trackEvent('member_approved', { user_id: userId });
      }
      await fetchUsers();
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error('Failed to update member status');
    }
  };

  const handleVisibility = async (userId: string, currentVisibility: boolean) => {
    try {
      // If userId is undefined, try to find by email
      const userToUpdate = users.find(u => u.uid === userId || u.email === selectedUser?.email);
      if (!userToUpdate?.uid) {
        console.error('Could not find user document');
        toast.error('Failed to update visibility');
        return;
      }

      await updateShowInMembers(userToUpdate.uid, !currentVisibility);
      trackEvent('member_visibility_updated', {
        user_id: userToUpdate.uid,
        visible: !currentVisibility
      });
      toast.success(currentVisibility ? 'Member hidden from directory' : 'Member visible in directory');
      await fetchUsers();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      await updateJoinRequestStatus(requestId, action, auth.currentUser?.email || '');
      
      // If approved, only send welcome email
      if (action === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          // Send welcome email
          const response = await fetch('/api/send-approval-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: request.email
            })
          });

          if (!response.ok) {
            console.error('Failed to send approval email');
            toast.error('Request approved but failed to send email');
          }
        }
      }

      // Refresh both requests and users
      const [updatedRequests, updatedUsers] = await Promise.all([
        getJoinRequests(),
        getAllUsers()
      ]);
      setRequests(updatedRequests);
      setUsers(updatedUsers as ExtendedUser[]);
      toast.success(`Request ${action} successfully`);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  const handleProfileCompletion = async (userId: string, currentStatus: boolean) => {
    try {
      // If userId is undefined, try to find by email
      const userToUpdate = users.find(u => u.uid === userId || u.email === selectedUser?.email);
      if (!userToUpdate?.uid) {
        console.error('Could not find user document');
        toast.error('Failed to update profile status');
        return;
      }

      await updateUserProfile(userToUpdate.uid, { 
        profileCompleted: !currentStatus 
      });
      
      await fetchUsers();
      
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          profileCompleted: !currentStatus
        });
      }
      
      toast.success(`Profile marked as ${!currentStatus ? 'complete' : 'incomplete'}`);
    } catch (error) {
      console.error('Error updating profile completion:', error);
      toast.error('Failed to update profile status');
    }
  };

  const handlePresentationRequest = async (requestId: string, isDone: boolean) => {
    try {
      await updatePresentationRequestStatus(requestId, isDone ? 'done' : 'pending', auth.currentUser?.email || '');
      // Refresh presentation requests
      const updatedRequests = await getPresentationRequests();
      setPresentationRequests(updatedRequests);
      toast.success(`Request marked as ${isDone ? 'done' : 'pending'}`);
    } catch (error) {
      console.error('Error handling presentation request:', error);
      toast.error('Failed to update request');
    }
  };

  const handleDeleteWorkshop = async (workshopId: string) => {
    if (!confirm('Are you sure you want to delete this workshop?')) return;

    try {
      await deleteWorkshop(workshopId);
      // Refresh workshops
      const updatedWorkshops = await getWorkshops();
      setWorkshops(updatedWorkshops);
      toast.success('Workshop deleted');
    } catch (error) {
      console.error('Error deleting workshop:', error);
      toast.error('Failed to delete workshop');
    }
  };

  if (!isAdmin) {
    return <div>Loading...</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded ${
              activeTab === 'users' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded ${
              activeTab === 'requests' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
            }`}
          >
            Join Requests
          </button>
          <button
            onClick={() => setActiveTab('workshops')}
            className={`px-4 py-2 rounded ${
              activeTab === 'workshops' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
            }`}
          >
            Workshops
          </button>
        </div>

        {/* Add sorting control */}
        {activeTab === 'users' && (
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="approval">Sort by Approval Status</option>
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Join Date</option>
            </select>
          </div>
        )}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Admins Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Admins</h2>
            {adminUsers.map((user) => (
              <div 
                key={user.uid}
                className="border rounded-lg p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || ''}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.displayName?.[0] || user.email?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium">{user.displayName}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Regular Users */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Members</h2>
            {nonAdminUsers.map((user) => (
              <div 
                key={user.uid}
                className="border rounded-lg p-4"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || ''}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.displayName?.[0] || user.email?.[0] || '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium">{user.displayName}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.linkedinUrl && (
                        <a
                          href={user.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline text-sm"
                        >
                          LinkedIn Profile
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center justify-end">
                    <button
                      onClick={() => handleProfileCompletion(user.uid, user.profileCompleted)}
                      className={`px-3 py-1 rounded text-sm ${
                        user.profileCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {user.profileCompleted ? 'Profile Complete' : 'Profile Incomplete'}
                    </button>
                    <button
                      onClick={() => handleVisibility(user.uid, user.showInMembers)}
                      className={`px-3 py-1 rounded text-sm ${
                        user.showInMembers
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.showInMembers ? 'Visible' : 'Hidden'}
                    </button>
                    {user.isApproved ? (
                      <button
                        onClick={() => handleApproval(user.uid, user.isApproved)}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm"
                      >
                        Remove Approval
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApproval(user.uid, true)}
                        className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded text-sm"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-1 text-gray-600 hover:text-gray-800"
                      title="View Details"
                    >
                      👁️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Join Requests</h2>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className={`text-sm ${!showRecentApproved ? 'font-semibold text-pink-600' : 'text-gray-600'}`}>
                  Pending ({pendingRequests.length})
                </span>
                <div 
                  onClick={() => setShowRecentApproved(!showRecentApproved)}
                  className={`relative w-12 h-6 transition-colors duration-200 ease-in-out rounded-full ${
                    showRecentApproved 
                      ? 'bg-green-200 border-2 border-green-300' 
                      : 'bg-pink-200 border-2 border-pink-300'
                  }`}
                >
                  <div
                    className={`absolute w-4 h-4 transition-transform duration-200 ease-in-out transform rounded-full top-0.5 ${
                      showRecentApproved 
                        ? 'translate-x-7 bg-green-500' 
                        : 'translate-x-1 bg-pink-500'
                    }`}
                  />
                </div>
                <span className={`text-sm ${showRecentApproved ? 'font-semibold text-green-600' : 'text-gray-600'}`}>
                  All ({requests.length})
                </span>
              </label>
            </div>
          </div>

          {showRecentApproved ? (
            allRequests.length === 0 ? (
              <p className="text-gray-600 italic">No requests</p>
            ) : (
              allRequests.map((request) => (
                <div
                  key={request.id || request.email}
                  className={`border p-4 rounded-lg ${
                    request.status === 'approved' 
                      ? 'border-green-500 bg-green-50' 
                      : request.status === 'rejected'
                      ? 'border-red-500 bg-red-50'
                      : 'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{request.name}</h3>
                      <p className="text-sm text-gray-600">{request.email}</p>
                      <p className="text-sm text-gray-600">
                        Status: {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </p>
                      {request.approvedAt && (
                        <p className="text-xs text-gray-500">
                          {request.status === 'approved' ? 'Approved' : 'Rejected'}: {new Date(request.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                      {request.linkedinUrl && (
                        <a
                          href={request.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline text-sm"
                        >
                          LinkedIn Profile
                        </a>
                      )}
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRequestAction(request.id!, 'approved')}
                          className="px-3 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(request.id!, 'rejected')}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <button
                        onClick={() => handleRequestAction(request.id!, 'rejected')}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Remove Approval
                      </button>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm">
                      <strong>About:</strong> {request.interests}
                    </p>
                  </div>
                </div>
              ))
            )
          ) : (
            pendingRequests.length === 0 ? (
              <p className="text-gray-600 italic">No pending requests</p>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id || request.email}
                  className="border border-yellow-500 bg-yellow-50 p-4 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{request.name}</h3>
                      <p className="text-sm text-gray-600">{request.email}</p>
                      {request.linkedinUrl && (
                        <a
                          href={request.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline text-sm"
                        >
                          LinkedIn Profile
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestAction(request.id!, 'approved')}
                        className="px-3 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRequestAction(request.id!, 'rejected')}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm">
                      <strong>About:</strong> {request.interests}
                    </p>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      )}

      {activeTab === 'workshops' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Workshop Management</h2>
            <Link
              href="/admin/workshops/new"
              className="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600"
            >
              Add Workshop
            </Link>
          </div>
          
          {/* Presentation Requests Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Presentation Requests</h3>
            
            {/* Active Requests */}
            <div className="space-y-4 mb-6">
              {presentationRequests
                .filter(req => req.status === 'pending')
                .map(request => (
                  <div key={request.id} className="border rounded-lg p-4 bg-yellow-50">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{request.title}</h4>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 inline-block mt-1">
                              {request.type}
                            </span>
                          </div>
                          <button
                            onClick={() => handlePresentationRequest(request.id!, true)}
                            className="text-2xl hover:scale-110 transition-transform relative group"
                          >
                            ⭕
                            <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                              Mark as done
                            </span>
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">by {request.userName}</p>
                        {request.type !== 'request' && (
                          <>
                            <p className="mt-2">{request.description}</p>
                            {request.proposedDate && (
                              <p className="text-sm text-gray-600 mt-1">
                                Preferred date: {new Date(request.proposedDate).toLocaleDateString()}
                              </p>
                            )}
                          </>
                        )}
                        {request.type === 'request' && request.description && (
                          <a 
                            href={request.description}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm block mt-1"
                          >
                            View Reference Link
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              {presentationRequests.filter(req => req.status === 'pending').length === 0 && (
                <p className="text-gray-600 italic">No pending requests</p>
              )}
            </div>

            {/* Completed Requests */}
            {presentationRequests.some(req => req.status === 'done') && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-md font-medium">Completed Requests</h4>
                  <button
                    onClick={() => setShowAllCompleted(!showAllCompleted)}
                    className="text-sm text-emerald-700 hover:text-emerald-800"
                  >
                    {showAllCompleted ? 'Show Less' : 'Show All'}
                  </button>
                </div>
                <div className="space-y-4">
                  {presentationRequests
                    .filter(req => req.status === 'done')
                    .slice(0, showAllCompleted ? undefined : 3)
                    .map(request => (
                      <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium">{request.title}</h4>
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 inline-block mt-1">
                                  {request.type}
                                </span>
                              </div>
                              <button
                                onClick={() => handlePresentationRequest(request.id!, false)}
                                className="text-2xl hover:scale-110 transition-transform relative group"
                              >
                                ✅
                                <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                                  Mark as pending
                                </span>
                              </button>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Completed {request.completedAt && new Date(request.completedAt).toLocaleDateString()} 
                              by {request.completedBy}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Workshops List */}
          <div>
            <h3 className="text-lg font-medium mb-4">Workshops</h3>
            
            {/* Upcoming Workshops */}
            <div className="mb-8">
              <h4 className="text-md font-medium mb-4">Upcoming</h4>
              <div className="space-y-4">
                {workshops
                  .filter(workshop => {
                    const workshopDate = new Date(workshop.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Reset time to start of day
                    return workshopDate >= today;
                  })
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map(workshop => (
                    <div key={workshop.id} className="border rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{workshop.title}</h4>
                          <p className="text-sm text-gray-600">
                            by{' '}
                            <a
                              href={workshop.presenterLinkedIn}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {workshop.presenterName}
                            </a>
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(workshop.date).toLocaleDateString()}
                          </p>
                          <p className="mt-2">{workshop.description}</p>
                          {workshop.youtubeUrl && (
                            <a
                              href={workshop.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm block mt-1"
                            >
                              Watch Recording
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/workshops/edit/${workshop.id}`}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-center"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteWorkshop(workshop.id!)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                {!workshops.some(w => {
                  const workshopDate = new Date(w.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return workshopDate >= today;
                }) && (
                  <p className="text-gray-600 italic">No upcoming workshops</p>
                )}
              </div>
            </div>

            {/* Past Workshops */}
            <div>
              <h4 className="text-md font-medium mb-4">Past</h4>
              <div className="space-y-4">
                {workshops
                  .filter(workshop => {
                    const workshopDate = new Date(workshop.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return workshopDate < today;
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Most recent first
                  .map(workshop => (
                    <div key={workshop.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{workshop.title}</h4>
                          <p className="text-sm text-gray-600">
                            by{' '}
                            <a
                              href={workshop.presenterLinkedIn}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {workshop.presenterName}
                            </a>
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(workshop.date).toLocaleDateString()}
                          </p>
                          <p className="mt-2">{workshop.description}</p>
                          {workshop.youtubeUrl && (
                            <a
                              href={workshop.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm block mt-1"
                            >
                              Watch Recording
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/workshops/edit/${workshop.id}`}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-center"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteWorkshop(workshop.id!)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                {!workshops.some(w => {
                  const workshopDate = new Date(w.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return workshopDate < today;
                }) && (
                  <p className="text-gray-600 italic">No past workshops</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                {selectedUser.photoURL ? (
                  <Image
                    src={selectedUser.photoURL}
                    alt={selectedUser.displayName ?? ''}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-15 h-15 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                    {selectedUser.displayName?.[0] ?? selectedUser.email?.[0] ?? '?'}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{selectedUser.displayName}</h2>
                  <p className="text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-8">
              {/* Profile Status */}
              <div>
                <h3 className="font-semibold mb-4">Profile Status</h3>
                <div className="flex flex-col gap-4">
                  {/* Profile Completion Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Profile Completed</span>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();  // Prevent modal from closing
                        if (selectedUser?.uid) {
                          handleProfileCompletion(selectedUser.uid, selectedUser.profileCompleted);
                        }
                      }}
                      className={`relative w-12 h-6 transition-colors duration-200 ease-in-out rounded-full cursor-pointer ${
                        selectedUser.profileCompleted 
                          ? 'bg-green-200 border-2 border-green-300' 
                          : 'bg-red-200 border-2 border-red-300'
                      }`}
                    >
                      <div
                        className={`absolute w-4 h-4 transition-transform duration-200 ease-in-out transform rounded-full top-0.5 ${
                          selectedUser.profileCompleted 
                            ? 'translate-x-7 bg-green-500' 
                            : 'translate-x-1 bg-red-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Visibility Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Visible in Directory</span>
                    <div 
                      onClick={() => handleVisibility(selectedUser.uid, selectedUser.showInMembers)}
                      className={`relative w-12 h-6 transition-colors duration-200 ease-in-out rounded-full cursor-pointer ${
                        selectedUser.showInMembers 
                          ? 'bg-emerald-200 border-2 border-emerald-300' 
                          : 'bg-gray-200 border-2 border-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute w-4 h-4 transition-transform duration-200 ease-in-out transform rounded-full top-0.5 ${
                          selectedUser.showInMembers 
                            ? 'translate-x-7 bg-emerald-500' 
                            : 'translate-x-1 bg-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* LinkedIn */}
              {selectedUser.linkedinUrl && (
                <div>
                  <h3 className="font-semibold mb-4">LinkedIn</h3>
                  <a 
                    href={selectedUser.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline"
                  >
                    View Profile →
                  </a>
                </div>
              )}

              {/* Status Flags */}
              {selectedUser.status && (
                <div>
                  <h3 className="font-semibold mb-4">Status Flags</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedUser.status).map(([key, value]) => (
                      <div key={`status-${key}`} className="flex items-center gap-2">
                        <span className={value ? 'text-green-600' : 'text-gray-400'}>
                          {value ? '✓' : '×'}
                        </span>
                        <span className="text-sm">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div>
                <h3 className="font-semibold mb-4">Dates</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  {selectedUser.joinedAt && !isNaN(new Date(selectedUser.joinedAt).getTime()) && (
                    <p>Joined: {new Date(selectedUser.joinedAt).toLocaleDateString()}</p>
                  )}
                  {selectedUser.approvedAt && !isNaN(new Date(selectedUser.approvedAt).getTime()) && (
                    <p>Approved: {new Date(selectedUser.approvedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Confirmation Dialog */}
      {confirmationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">{confirmationDialog.title}</h3>
            <p className="text-gray-600 mb-6">{confirmationDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmationDialog(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmationDialog.action();
                  setConfirmationDialog(null);
                }}
                className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 
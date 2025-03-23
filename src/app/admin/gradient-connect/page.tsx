'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/firebaseConfig';
import { ADMIN_EMAILS } from '@/app/config/admin';
import { GradientConnectSignup } from '@/app/types';
import { getFirestore, collection, getDocs, updateDoc, doc, addDoc, query, where, getDoc } from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { DroppableTeam } from '@/components/DroppableTeam';
import { DroppableArea } from '@/components/DroppableArea';
import AdminProtectedPage from "@/components/AdminProtectedPage";

interface Team {
  id: string;
  members: GradientConnectSignup[];
  notes?: string;
}

interface TeamArrangement {
  id?: string;
  sessionDate: string;
  teams: Team[];
}

interface FirebaseError extends Error {
  code?: string;
}

export default function GradientConnectAdminPage() {
  const [user] = useAuthState(auth);
  const [allSessions, setAllSessions] = useState<Record<string, GradientConnectSignup[]>>({});
  const [currentSession, setCurrentSession] = useState<string>('');
  const [signups, setSignups] = useState<GradientConnectSignup[]>([]);
  const [teams, setTeams] = useState<Team[]>([{ id: '1', members: [] }]);
  const [loading, setLoading] = useState(true);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEventDate, setNewEventDate] = useState('');
  const [activeDragData, setActiveDragData] = useState<GradientConnectSignup | null>(null);

  useEffect(() => {
    fetchSignups();
  }, [user]);

  const updateMatches = useCallback(async (currentTeams: Team[]) => {
    const db = getFirestore();
    try {
      if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
        toast.error('You do not have permission to update matches');
        return;
      }

      // Reset all matches first
      await Promise.all(signups.map(signup => 
        updateDoc(doc(db, 'gradientConnectSignups', signup.id!), {
          'status.matched': false,
          'status.matchedWith': null,
          'status.matchedWithName': null
        })
      ));

      // Update new matches
      await Promise.all(currentTeams.flatMap(team => {
        if (team.members.length !== 2) return [];
        
        const [member1, member2] = team.members;
        return [
          updateDoc(doc(db, 'gradientConnectSignups', member1.id!), {
            'status.matched': true,
            'status.matchedWith': member2.userId,
            'status.matchedWithName': member2.userName
          }),
          updateDoc(doc(db, 'gradientConnectSignups', member2.id!), {
            'status.matched': true,
            'status.matchedWith': member1.userId,
            'status.matchedWithName': member1.userName
          })
        ];
      }));

      toast.success('Teams updated successfully');
    } catch (error) {
      console.error('Error updating matches:', error);
      if ((error as FirebaseError).code === 'permission-denied') {
        toast.error('You do not have permission to update matches');
      } else {
        toast.error('Failed to update teams');
      }
    }
  }, [user?.email, signups]);

  const saveTeams = useCallback(async (updatedTeams: Team[]) => {
    const db = getFirestore();
    try {
      if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
        toast.error('You do not have permission to manage teams');
        return;
      }

      // Find existing team arrangement for this session
      const teamsRef = collection(db, 'gradientConnectTeams');
      const teamsQuery = query(teamsRef, where('sessionDate', '==', currentSession));
      const teamsSnapshot = await getDocs(teamsQuery);
      
      if (!teamsSnapshot.empty) {
        // Update existing arrangement
        const docId = teamsSnapshot.docs[0].id;
        await updateDoc(doc(db, 'gradientConnectTeams', docId), {
          teams: updatedTeams
        });
      } else {
        // Create new arrangement
        await addDoc(teamsRef, {
          sessionDate: currentSession,
          teams: updatedTeams
        });
      }
    } catch (error) {
      console.error('Error saving teams:', error);
      if ((error as FirebaseError).code === 'permission-denied') {
        toast.error('You do not have permission to manage teams');
      } else {
        toast.error('Failed to save teams');
      }
    }
  }, [user?.email, currentSession]);

  useEffect(() => {
    const handleRemoveFromTeam = async (event: Event) => {
      const customEvent = event as CustomEvent<{ memberId: string }>;
      const { memberId } = customEvent.detail;
      
      // Find the member to remove
      const memberToRemove = teams.flatMap(t => t.members).find(m => m.id === memberId);
      if (!memberToRemove) {
        console.log('Member not found:', memberId);
        return;
      }

      console.log('Found member to remove:', memberToRemove.userName);

      // Update teams
      const updatedTeams = teams.map(team => ({
        ...team,
        members: team.members.filter(m => m.id !== memberId)
      }));

      // Add to unassigned only if not already there
      setSignups(prev => {
        // Check if user is already in signups
        const exists = prev.some(s => s.id === memberId);
        if (exists) {
          return prev;
        }
        return [...prev, memberToRemove];
      });

      setTeams(updatedTeams);
      
      // Save changes
      await saveTeams(updatedTeams);
      await updateMatches(updatedTeams);
    };

    window.addEventListener('removeFromTeam', handleRemoveFromTeam);
    return () => {
      window.removeEventListener('removeFromTeam', handleRemoveFromTeam);
    };
  }, [teams, signups, saveTeams, updateMatches]);

  const fetchSignups = async () => {
    try {
      const db = getFirestore();
      
      // Fetch both signups and events
      const [signupsSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(collection(db, 'gradientConnectSignups')),
        getDocs(collection(db, 'gradientConnectEvents'))
      ]);
      
      // Process signups
      const signupsData = signupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: {
          inviteSent: false,
          inviteAccepted: false,
          matched: false,
          ...(doc.data().status || {})
        }
      })) as GradientConnectSignup[];

      // Create a map of all event dates
      const allDates = new Map<string, GradientConnectSignup[]>();
      
      // Add all event dates first (even if they have no signups)
      eventsSnapshot.docs.forEach(doc => {
        const eventDate = new Date(doc.data().date);
        const dateKey = eventDate.toLocaleDateString('en-US', { 
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        allDates.set(dateKey, []);
      });

      // Then add signups to their respective dates
      signupsData.forEach(signup => {
        const date = new Date(signup.matchingDate);
        const dateKey = date.toLocaleDateString('en-US', { 
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        const existing = allDates.get(dateKey) || [];
        allDates.set(dateKey, [...existing, signup]);
      });

      // Convert map to object
      const grouped = Object.fromEntries(allDates);
      setAllSessions(grouped);
      
      // Set current session to the most recent one
      const sortedDates = Object.keys(grouped).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );
      
      if (sortedDates.length > 0) {
        setCurrentSession(sortedDates[0]);
        setSignups(grouped[sortedDates[0]] || []);
        
        // Fetch teams for this session
        const teamsRef = collection(db, 'gradientConnectTeams');
        const teamsQuery = query(teamsRef, where('sessionDate', '==', sortedDates[0]));
        const teamsSnapshot = await getDocs(teamsQuery);
        
        if (!teamsSnapshot.empty) {
          const teamData = teamsSnapshot.docs[0].data() as TeamArrangement;
          setTeams(teamData.teams);
        } else {
          // No teams yet, start with empty team
          setTeams([{ id: '1', members: [] }]);
        }
      }

      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error(error);
    }
  };

  const handleSessionChange = async (date: string) => {
    setCurrentSession(date);
    setSignups(allSessions[date]);
    
    // Fetch teams for the selected session
    try {
      const db = getFirestore();
      const teamsRef = collection(db, 'gradientConnectTeams');
      const teamsQuery = query(teamsRef, where('sessionDate', '==', date));
      const teamsSnapshot = await getDocs(teamsQuery);
      
      if (!teamsSnapshot.empty) {
        const teamData = teamsSnapshot.docs[0].data() as TeamArrangement;
        setTeams(teamData.teams);
      } else {
        // No teams yet, start with empty team
        setTeams([{ id: '1', members: [] }]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to fetch teams');
    }
  };

  const updateSignupStatus = async (signupId: string, updates: Partial<GradientConnectSignup['status']>) => {
    try {
      const db = getFirestore();
      const signupRef = doc(db, 'gradientConnectSignups', signupId);
      
      // Get current status first
      const signupDoc = await getDoc(signupRef);
      if (!signupDoc.exists()) {
        throw new Error('Signup not found');
      }

      console.log('Current document data:', signupDoc.data()); // Log current data

      // Get the full current status with all fields
      const currentStatus = {
        inviteSent: false,
        inviteAccepted: false,
        matched: false,
        matchedWith: null,
        matchedWithName: null,
        ...(signupDoc.data().status || {}),
      };

      console.log('Current status:', currentStatus); // Log current status
      console.log('Updates to apply:', updates); // Log updates

      // Create new status preserving all fields
      const newStatus = {
        ...currentStatus,
        ...updates
      };

      console.log('New status to save:', newStatus); // Log new status

      // Update the document
      await updateDoc(signupRef, {
        status: newStatus
      });
      
      // Update local state
      setSignups(prev => {
        const newSignups = prev.map(signup => 
          signup.id === signupId 
            ? { ...signup, status: newStatus }
            : signup
        );
        console.log('Updated signups state:', newSignups); // Log updated state
        return newSignups;
      });

      // Also update teams if the user is in a team
      setTeams(prev => {
        const newTeams = prev.map(team => ({
          ...team,
          members: team.members.map(member => 
            member.id === signupId 
              ? { ...member, status: newStatus }
              : member
          )
        }));
        console.log('Updated teams state:', newTeams); // Log updated teams
        return newTeams;
      });

      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const createNewEvent = async () => {
    try {
      if (!newEventDate) {
        toast.error('Please select a date');
        return;
      }

      const date = new Date(newEventDate);
      date.setUTCHours(17, 0, 0, 0); // Set to 5 PM UTC

      const db = getFirestore();
      await addDoc(collection(db, 'gradientConnectEvents'), {
        date: date.toISOString(),
        createdAt: new Date().toISOString(),
        status: 'upcoming'
      });

      toast.success('New Gradient Connect event created!');
      setShowNewEventForm(false);
      setNewEventDate('');
      fetchSignups(); // Refresh the data
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    
    // Find the dragged item
    const draggedItem = signups.find(s => s.id === activeId) || 
      teams.flatMap(t => t.members).find(m => m.id === activeId);
    
    if (draggedItem) {
      setActiveDragData(draggedItem);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragData(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    let targetId = over.id as string;
    let updatedTeams = [...teams];

    // Find the dragged signup from both signups and teams
    const draggedSignup = signups.find(s => s.id === activeId) || 
      teams.flatMap(t => t.members).find(m => m.id === activeId);

    if (!draggedSignup) return;

    // If dropping back to unassigned
    if (targetId === 'unassigned') {
      // Remove from teams
      updatedTeams = teams.map(team => ({
        ...team,
        members: team.members.filter(m => m.id !== activeId)
      }));

      // Add to unassigned if not already there
      if (!signups.some(s => s.id === activeId)) {
        setSignups(prev => [...prev, draggedSignup]);
      }
      
      setTeams(updatedTeams);
      await saveTeams(updatedTeams);
      await updateMatches(updatedTeams);
      return;
    }

    // Check if all teams are full
    const allTeamsFull = updatedTeams.every(team => team.members.length >= 2);
    
    // If all teams are full and trying to drop on a team, create a new team
    if (allTeamsFull && targetId.startsWith('team-')) {
      const newTeam: Team = { id: `${teams.length + 1}`, members: [] };
      updatedTeams = [...teams, newTeam];
      setTeams(updatedTeams);
      
      // Update targetId to target the new team
      targetId = `team-${newTeam.id}`;
    }

    // If dropping on a team
    if (targetId.startsWith('team-')) {
      const teamId = targetId.replace('team-', '');
      const targetTeam = updatedTeams.find(t => t.id === teamId);
      if (!targetTeam) return;

      // Check if team already has 2 members
      if (targetTeam.members.length >= 2) {
        toast.error('Teams can only have 2 members');
        return;
      }

      // Remove from current location (both signups and teams)
      const newSignups = signups.filter(s => s.id !== activeId);
      const newTeams = updatedTeams.map(team => ({
        ...team,
        members: team.members.filter(m => m.id !== activeId)
      }));

      // Add to new team
      updatedTeams = newTeams.map(team => 
        team.id === teamId 
          ? { ...team, members: [...team.members, draggedSignup] }
          : team
      );

      setSignups(newSignups);
      setTeams(updatedTeams);
      await updateMatches(updatedTeams);
      await saveTeams(updatedTeams);
    }

    // Check if we need to add a new team
    const unassignedCount = getUnassignedSignups().length;
    if (unassignedCount > 0 && updatedTeams.every(team => team.members.length >= 2)) {
      // Add a new empty team
      updatedTeams = [...updatedTeams, { id: `${updatedTeams.length + 1}`, members: [] }];
      setTeams(updatedTeams);
      await saveTeams(updatedTeams);
    }
  };

  const addNewTeam = async () => {
    const updatedTeams = [...teams, { id: `${teams.length + 1}`, members: [] }];
    setTeams(updatedTeams);
    await saveTeams(updatedTeams);
  };

  // Add this function to filter out assigned users
  const getUnassignedSignups = () => {
    const assignedUserIds = new Set(teams.flatMap(team => team.members.map(m => m.id)));
    return signups.filter(signup => !assignedUserIds.has(signup.id!));
  };

  const resetAllStatuses = async () => {
    try {
      const db = getFirestore();
      
      // Get all signups for current session
      const currentSignups = allSessions[currentSession] || [];
      
      // Reset status for all users in current session
      await Promise.all(currentSignups.map(signup => 
        updateDoc(doc(db, 'gradientConnectSignups', signup.id!), {
          status: {
            inviteSent: false,
            inviteAccepted: false,
            matched: false,
            matchedWith: null,
            matchedWithName: null
          }
        })
      ));

      // Reset teams
      setTeams([{ id: '1', members: [] }]);
      await saveTeams([{ id: '1', members: [] }]);

      toast.success('All statuses reset successfully');
      await fetchSignups(); // Refresh the data
    } catch (error) {
      console.error('Error resetting statuses:', error);
      toast.error('Failed to reset statuses');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AdminProtectedPage>
      <main className="min-h-screen p-4">
        <Toaster position="top-center" />
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Gradient Connect Admin</h1>
              {/* Session selector */}
              <div className="mt-2">
                <select
                  value={currentSession}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm bg-white"
                >
                  {Object.keys(allSessions)
                    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                    .map(date => (
                      <option key={date} value={date}>
                        {date}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetAllStatuses}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Reset All
              </button>
              <button
                onClick={() => setShowNewEventForm(true)}
                className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800"
              >
                <PlusIcon className="h-5 w-5" />
                New Event
              </button>
            </div>
          </div>

          {/* New Event Form */}
          {showNewEventForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-lg font-semibold mb-4">Create New Event</h2>
              <div className="flex gap-4">
                <input
                  type="datetime-local"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button
                  onClick={createNewEvent}
                  className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewEventForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4">
              {/* Teams Section */}
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Teams</h2>
                  <button
                    onClick={addNewTeam}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Team
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <DroppableTeam
                      key={team.id}
                      id={`team-${team.id}`}
                      teamNumber={team.id}
                      members={team.members}
                      notes={team.notes}
                      onNotesChange={async (notes) => {
                        const updatedTeams = teams.map(t => 
                          t.id === team.id ? { ...t, notes } : t
                        );
                        setTeams(updatedTeams);
                        await saveTeams(updatedTeams);
                      }}
                      onInviteSentToggle={async (userId) => {
                        const member = team.members.find(m => m.id === userId);
                        if (member) {
                          await updateSignupStatus(userId, {
                            ...member.status,
                            inviteSent: !member.status.inviteSent
                          });
                        }
                      }}
                      onInviteAcceptedToggle={async (userId) => {
                        const member = team.members.find(m => m.id === userId);
                        if (member) {
                          await updateSignupStatus(userId, {
                            ...member.status,
                            inviteAccepted: !member.status.inviteAccepted
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Unassigned Section */}
              <div className="w-64 shrink-0">
                <h2 className="text-xl font-semibold mb-4">Unassigned</h2>
                <DroppableArea
                  id="unassigned"
                  items={getUnassignedSignups()}
                  onInviteSentToggle={async (userId) => {
                    const signup = signups.find(s => s.id === userId);
                    if (signup) {
                      await updateSignupStatus(userId, {
                        ...signup.status,
                        inviteSent: !signup.status.inviteSent
                      });
                    }
                  }}
                  onInviteAcceptedToggle={async (userId) => {
                    const signup = signups.find(s => s.id === userId);
                    if (signup) {
                      await updateSignupStatus(userId, {
                        ...signup.status,
                        inviteAccepted: !signup.status.inviteAccepted
                      });
                    }
                  }}
                />
              </div>
            </div>

            <DragOverlay>
              {activeDragData ? (
                <div className="bg-white p-2 rounded shadow-md">
                  {activeDragData.userName}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </main>
    </AdminProtectedPage>
  );
} 
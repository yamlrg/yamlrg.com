'use client';

import ProtectedPage from "@/components/ProtectedPage";
import { useEffect, useCallback, useState } from "react";
import { getVisibleMembers } from "../firebase/firestoreOperations";
import { YamlrgUserProfile, UserStatus, GradientConnectEvent } from '../types';
import Image from 'next/image';
import Link from "next/link";
import { UserIcon, EnvelopeIcon, StarIcon } from '@heroicons/react/24/outline';
import { FaLinkedin } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { ADMIN_EMAILS } from '../config/admin';
import { getFirestore, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/firebaseConfig';
import { MemberProfileModal } from '@/components/MemberProfileModal';
import { formatLinkedInUrl } from '@/utils/linkedin';
import MemberGrowthChart from '@/components/MemberGrowthChart';

interface GrowthDataPoint {
  month: string; // e.g. '2024-01'
  members: number;
}

const getTimestamp = (member: YamlrgUserProfile) => {
  return new Date(member.joinedAt ?? member.approvedAt ?? 0).getTime();
};

export default function MembersPage() {
  const [members, setMembers] = useState<YamlrgUserProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<YamlrgUserProfile | null>(null);
  const [filters, setFilters] = useState<Partial<UserStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [user] = useAuthState(auth);
  const [upcomingEvent, setUpcomingEvent] = useState<GradientConnectEvent | null>(null);
  const [hasSignedUp, setHasSignedUp] = useState(false);

  const statusOptions = [
    { key: 'lookingForCofounder', label: 'Looking for Co-founders', color: 'bg-purple-100 text-purple-800' },
    { key: 'needsProjectHelp', label: 'Need Project Help', color: 'bg-red-100 text-red-800' },
    { key: 'offeringProjectHelp', label: 'Offering Help', color: 'bg-green-100 text-green-800' },
    { key: 'isHiring', label: 'Hiring', color: 'bg-blue-100 text-blue-800' },
    { key: 'seekingJob', label: 'Job Seeking', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'openToNetworking', label: 'Open to Networking', color: 'bg-emerald-100 text-emerald-800' },
  ] as const;

  const fetchMembers = useCallback(async () => {
    try {
      console.log('Fetching members...');
      const visibleMembers = await getVisibleMembers();
      setMembers(visibleMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const processGrowthData = (members: YamlrgUserProfile[]) => {
      // Aggregate by month
      const monthlyCounts: Record<string, number> = {};
      members.forEach((member) => {
        const timestamp = member.joinedAt ?? member.approvedAt;
        if (timestamp) {
          const date = new Date(timestamp);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
        }
      });
      // Convert to array sorted by month
      const data: GrowthDataPoint[] = Object.entries(monthlyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, members]) => ({ month, members }));
      setGrowthData(data);
    };

    if (members.length > 0) {
      processGrowthData(members);
    }
  }, [members]);

  useEffect(() => {
    const checkGradientConnectStatus = async () => {
      if (!user) return;
      try {
        const db = getFirestore();
        const eventsRef = collection(db, 'gradientConnectEvents');
        const eventsSnapshot = await getDocs(eventsRef);

        // Get the nearest upcoming event whose date is in the future
        const now = new Date();
        const events = eventsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as GradientConnectEvent))
          .filter(event => event.status === 'upcoming' && new Date(event.date) > now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (events.length === 0) {
          setUpcomingEvent(null);
          return;
        }

        const nextEvent = events[0];
        setUpcomingEvent(nextEvent);

        // Check if user has signed up for this event
        const signupsRef = collection(db, 'gradientConnectSignups');
        const signupQuery = query(
          signupsRef,
          where('userId', '==', user.uid),
          where('matchingDate', '==', nextEvent.date)
        );
        const signupSnapshot = await getDocs(signupQuery);
        setHasSignedUp(!signupSnapshot.empty);
      } catch (error) {
        console.error('Error checking Gradient Connect status:', error);
      }
    };

    checkGradientConnectStatus();
  }, [user]);

  const filteredMembers = members.filter(member => {
    // Trim spaces and normalize both strings to handle accented characters
    const searchTerm = searchQuery.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const memberName = (member.displayName?.toLowerCase().trim() || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l');  // Special handling for Polish 'ł'

    // If there's no search term, include the member
    if (!searchTerm) return true;

    // Split search term into words
    const searchWords = searchTerm.split(/\s+/);
    
    // Check if all search words are included in the name
    const matchesSearch = searchWords.every(word => memberName.includes(word));

    // Filter conditions
    const matchesFilters = Object.entries(filters).every(([key, value]) => {
      return !value || (member.status && member.status[key as keyof UserStatus]);
    });

    return matchesSearch && (!Object.keys(filters).length || matchesFilters);
  });

  const toggleFilter = (key: keyof UserStatus) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSignUp = async () => {
    if (!user || !upcomingEvent) return;
    try {
      const db = getFirestore();
      const signupsRef = collection(db, 'gradientConnectSignups');
      // Check if already signed up
      const existingQuery = query(
        signupsRef,
        where('userId', '==', user.uid),
        where('matchingDate', '==', upcomingEvent.date)
      );
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        setHasSignedUp(true);
        return;
      }
      await addDoc(signupsRef, {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        matchingDate: upcomingEvent.date,
        status: { inviteSent: false },
        createdAt: new Date().toISOString()
      });
      setHasSignedUp(true);
    } catch (error) {
      console.error('Error signing up for Gradient Connect:', error);
    }
  };

  return (
    <ProtectedPage>
      <div className="container mx-auto px-4 py-8">
        <Toaster position="top-center" />
        
        {selectedMember && (
          <MemberProfileModal
            member={selectedMember}
            isOpen={!!selectedMember}
            onClose={() => setSelectedMember(null)}
          />
        )}
        
        <main className="min-h-screen p-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">YAMLRG Members ✨</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Search bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="mb-8">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Filter Members</h2>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key as keyof UserStatus)}
                  className={`text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2 rounded-full border ${
                    filters[key as keyof UserStatus] 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Show active filters summary */}
          {Object.entries(filters).some(([, value]) => value) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(filters)
                .filter(([, value]) => value)
                .map(([key]) => (
                  <span 
                    key={key}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {statusOptions.find(opt => opt.key === key)?.label}
                    <button
                      onClick={() => toggleFilter(key as keyof UserStatus)}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setFilters({})}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Gradient Connect section */}
          {upcomingEvent && (
            <div className="mb-8">
              {hasSignedUp ? (
                <div className="bg-gradient-to-r from-pink-100 via-orange-50 to-orange-100 text-pink-900 p-4 rounded-lg border border-pink-200/50 shadow-sm">
                  <p className="font-medium text-sm">
                    🥳 You&apos;re signed up for Gradient Connect on {new Date(upcomingEvent.date).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}!
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">🤝 Gradient Connect</h2>
                      <div className="mb-2 text-emerald-800 font-medium">
                        The next Gradient Connect is on {new Date(upcomingEvent.date).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <button
                      onClick={handleSignUp}
                      className="bg-emerald-700 text-white px-6 py-2 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
                      disabled={hasSignedUp}
                    >
                      {hasSignedUp ? 'You are signed up!' : 'Sign me up'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <div 
                key={member.uid} 
                className={`bg-white rounded-lg shadow p-4 relative ${
                  ADMIN_EMAILS.includes(member.email) ? 'border-2 border-purple-300' : ''
                } cursor-pointer hover:shadow-lg transition-shadow`}
                onClick={() => setSelectedMember(member)}
              >
                <div className="flex items-start gap-4">
                  {member.photoURL ? (
                    <Image
                      src={member.photoURL || '/default-avatar.png'}
                      alt={member.displayName || 'Member'}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-grow">
                    <h3 className="font-medium">{member.displayName}</h3>
                    
                    {/* Social links row */}
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        {(member.showEmail ?? true) && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(member.email);
                              toast.success('Email copied to clipboard!');
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title={member.email}
                          >
                            <EnvelopeIcon className="w-5 h-5" />
                          </button>
                        )}
                        
                        {member.linkedinUrl && (
                          <a
                            href={formatLinkedInUrl(member.linkedinUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <FaLinkedin className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-3">
                  {member.status && Object.entries(member.status).map(([key, value]) => 
                    value ? (
                      <span
                        key={key}
                        className={`text-xs px-2 py-1 rounded-full ${
                          statusOptions.find(opt => opt.key === key)?.color
                        }`}
                      >
                        {statusOptions.find(opt => opt.key === key)?.label}
                      </span>
                    ) : null
                  )}
                </div>

                <div className="flex items-center gap-1 justify-end text-sm text-gray-600 mt-2">
                  <StarIcon className="w-4 h-4 text-yellow-400" />
                  <span>{member.points || 0}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Growth Graph */}
          <div className="mt-16 mb-8">
            <h2 className="text-xl font-semibold mb-4">YAMLRG Growth</h2>
            <MemberGrowthChart data={growthData} />
          </div>

          <div className="text-center py-8 text-gray-600">
            No upcoming events scheduled yet. Check back soon!
          </div>
        </main>
      </div>
    </ProtectedPage>
  );
}

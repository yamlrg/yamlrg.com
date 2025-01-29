'use client';

import ProtectedPage from "@/components/ProtectedPage";
import { useEffect, useCallback, useState } from "react";
import { getVisibleMembers, getUserProfile } from "../firebase/firestoreOperations";
import { ExtendedUser, UserStatus } from '../types';
import Image from 'next/image';
import { auth } from "../firebase/firebaseConfig";
import Link from "next/link";
import { ADMIN_EMAILS } from '../config/admin';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GrowthDataPoint {
  date: string;
  members: number;
}

const getTimestamp = (member: ExtendedUser): number => {
  if (member.joinedAt) {
    const timestamp = new Date(member.joinedAt).getTime();
    console.log(`JoinedAt timestamp for ${member.displayName}:`, new Date(member.joinedAt).toLocaleString());
    return timestamp;
  }
  if (member.approvedAt) {
    const timestamp = new Date(member.approvedAt).getTime();
    console.log(`ApprovedAt timestamp for ${member.displayName}:`, new Date(member.approvedAt).toLocaleString());
    return timestamp;
  }
  return 0;
};

export default function MembersPage() {
  const [members, setMembers] = useState<ExtendedUser[]>([]);
  const [filters, setFilters] = useState<Partial<UserStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [isUserApproved, setIsUserApproved] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const statusOptions = [
    { key: 'lookingForCofounder', label: 'Looking for Co-founders' },
    { key: 'needsProjectHelp', label: 'Need Project Help' },
    { key: 'offeringProjectHelp', label: 'Offering Help' },
    { key: 'isHiring', label: 'Hiring' },
    { key: 'seekingJob', label: 'Job Seeking' },
    { key: 'openToNetworking', label: 'Open to Networking' },
  ] as const;

  // First, wait for auth to be ready
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const isAdmin = ADMIN_EMAILS.includes(user.email || '');
        if (isAdmin) {
          setIsUserApproved(true);
        } else {
          getUserProfile(user.uid).then(profile => {
            setIsUserApproved(profile?.isApproved || false);
          });
        }
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!authChecked) return;
    try {
      console.log("Fetching members");
      const visibleMembers = await getVisibleMembers();
      console.log("Fetched members:", visibleMembers);
      setMembers(visibleMembers as ExtendedUser[]);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  }, [authChecked]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const processGrowthData = (members: ExtendedUser[]) => {
      
      // Sort members by join date (fallback to approvedAt)
      const sortedMembers = [...members].sort((a, b) => {
        return getTimestamp(a) - getTimestamp(b);
      });

      // Create cumulative growth data
      const data: GrowthDataPoint[] = [];
      let count = 0;
      sortedMembers.forEach((member) => {
        const timestamp = member.joinedAt ?? member.approvedAt;
        if (timestamp) {
          count++;
          const date = new Date(timestamp).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit'
          });
          
          // Only add point if it's a new date or the last member
          const lastPoint = data[data.length - 1];
          if (!lastPoint || lastPoint.date !== date) {
            data.push({ date, members: count });
          } else {
            // Update the count for the existing date
            lastPoint.members = count;
          }
        }
      });

      console.log("Final growth data:", data);
      setGrowthData(data);
    };

    if (members.length > 0) {
      processGrowthData(members);
    }
  }, [members]);

  const toggleFilter = (key: keyof UserStatus) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filter members based on search query
  const filteredMembers = members.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.displayName?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <ProtectedPage>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Members</h1>
          <Link href="/wrapped" className="inline-block text-blue-600 hover:text-blue-800">
            Check out our 2024 Wrapped 🎁
          </Link>
        </div>
        
        {/* Show approval message only if not admin and not approved */}
        {!isUserApproved && !ADMIN_EMAILS.includes(auth.currentUser?.email || '') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-blue-800">
              You currently have limited access to our member directory. To see all members, 
              you need to be approved by our admins. For quick approval, please contact either{' '}
              <Link 
                href="https://www.linkedin.com/in/marialuqueanguita/" 
                target="_blank" 
                className="text-blue-600 hover:underline font-semibold"
              >
                Maria
              </Link>
              {' '}or{' '}
              <Link 
                href="https://www.linkedin.com/in/callumtilbury/" 
                target="_blank" 
                className="text-blue-600 hover:underline font-semibold"
              >
                Callum
              </Link>.
            </p>
          </div>
        )}

        <main className="min-h-screen p-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">YAMLRG Members ✨</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Search bar */}
          <div className="mb-8">
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
            <h2 className="text-xl font-semibold mb-4">Filter Members</h2>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`px-4 py-2 rounded-full border ${
                    filters[key] 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <div
                key={member.uid}
                className="p-4 border rounded-lg shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  {member.photoURL && (
                    <Image
                      src={member.photoURL}
                      alt={member.displayName || ''}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <h2 className="font-semibold">{member.displayName}</h2>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                </div>
                
                {member.linkedinUrl && (
                  <a
                    href={member.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm block mb-2"
                  >
                    LinkedIn Profile
                  </a>
                )}

                <div className="flex flex-wrap gap-1">
                  {Object.entries(member.status).map(([key, value]) => 
                    value ? (
                      <span
                        key={key}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                      >
                        {statusOptions.find(opt => opt.key === key)?.label}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Growth Graph - shown to approved members and admins */}
          {(isUserApproved || ADMIN_EMAILS.includes(auth.currentUser?.email || '')) && (
            <div className="mt-16 mb-8">
              <h2 className="text-xl font-semibold mb-4">YAMLRG Growth</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={[0, 'dataMax + 5']}
                    />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="members" 
                      stroke="#4F46E5" 
                      strokeWidth={2}
                      dot={{ fill: '#4F46E5', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedPage>
  );
}

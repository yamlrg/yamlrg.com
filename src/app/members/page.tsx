'use client';

import ProtectedPage from "@/components/ProtectedPage";
import { useEffect, useCallback, useState } from "react";
import { getVisibleMembers } from "../firebase/firestoreOperations";
import { YamlrgUserProfile, UserStatus } from '../types';
import Image from 'next/image';
import { auth } from "../firebase/firebaseConfig";
import Link from "next/link";
import { ADMIN_EMAILS } from '../config/admin';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { FaLinkedin } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';

interface GrowthDataPoint {
  date: string;
  members: number;
}

const getTimestamp = (member: YamlrgUserProfile) => {
  return new Date(member.joinedAt ?? member.approvedAt ?? 0).getTime();
};

export default function MembersPage() {
  const [members, setMembers] = useState<YamlrgUserProfile[]>([]);
  const [filters, setFilters] = useState<Partial<UserStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);

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
      const sortedMembers = [...members].sort((a, b) => {
        return getTimestamp(a) - getTimestamp(b);
      });

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
          
          const lastPoint = data[data.length - 1];
          if (!lastPoint || lastPoint.date !== date) {
            data.push({ date, members: count });
          } else {
            lastPoint.members = count;
          }
        }
      });

      setGrowthData(data);
    };

    if (members.length > 0) {
      processGrowthData(members);
    }
  }, [members]);

  const filteredMembers = members.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      member.displayName?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    const activeFilters = Object.entries(filters).filter(([, value]) => value);
    
    if (activeFilters.length === 0) return true;

    return activeFilters.every(([key]) => member.status?.[key as keyof UserStatus]);
  });

  const toggleFilter = (key: keyof UserStatus) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <ProtectedPage>
      <div className="container mx-auto px-4 py-8">
        <Toaster position="top-center" />
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Members</h1>
          <Link href="/wrapped" className="inline-block text-blue-600 hover:text-blue-800">
            Check out our 2024 Wrapped 🎁
          </Link>
        </div>
        
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
                  onClick={() => toggleFilter(key as keyof UserStatus)}
                  className={`px-4 py-2 rounded-full border ${
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

          {/* Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <div key={member.uid} className="bg-white rounded-lg shadow p-4 relative">
                {member.linkedinUrl && (
                  <a
                    href={member.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-4 right-4 text-gray-400 hover:text-blue-600"
                    title="View LinkedIn Profile"
                  >
                    <FaLinkedin className="w-5 h-5" />
                  </a>
                )}

                <div className="flex items-start gap-4">
                  {member.photoURL ? (
                    <Image
                      src={member.photoURL}
                      alt={member.displayName}
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
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(member.email);
                        toast.success('Email copied to clipboard!');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      title={member.email}
                    >
                      <EnvelopeIcon className="w-5 h-5" />
                    </button>
                    {member.linkedinUrl && (
                      <a
                        href={member.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600"
                        title="View LinkedIn Profile"
                      >
                        <FaLinkedin className="w-5 h-5" />
                      </a>
                    )}
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
              </div>
            ))}
          </div>

          {/* Growth Graph - shown to approved members and admins */}
          {ADMIN_EMAILS.includes(auth.currentUser?.email || '') && (
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

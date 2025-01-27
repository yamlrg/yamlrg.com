'use client';

import ProtectedPage from "@/components/ProtectedPage";
import { useEffect, useCallback, useState } from "react";
import { getVisibleMembers } from "../firebase/firestoreOperations";
import { ExtendedUser, UserStatus } from '../types';
import Image from 'next/image';

export default function MembersPage() {
  const [members, setMembers] = useState<ExtendedUser[]>([]);
  const [filters, setFilters] = useState<Partial<UserStatus>>({});

  const statusOptions = [
    { key: 'lookingForCofounder', label: 'Looking for Co-founders' },
    { key: 'needsProjectHelp', label: 'Need Project Help' },
    { key: 'offeringProjectHelp', label: 'Offering Help' },
    { key: 'isHiring', label: 'Hiring' },
    { key: 'seekingJob', label: 'Job Seeking' },
    { key: 'openToNetworking', label: 'Open to Networking' },
  ] as const;

  const fetchMembers = useCallback(async () => {
    const visibleMembers = await getVisibleMembers(filters);
    setMembers(visibleMembers as ExtendedUser[]);
  }, [filters]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const toggleFilter = (key: keyof UserStatus) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <ProtectedPage>
      <main className="min-h-screen p-4">
        <h1 className="text-3xl font-bold text-center mb-8">YAMLRG Members ✨</h1>
        
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
          {members.map((member) => (
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
      </main>
    </ProtectedPage>
  );
}

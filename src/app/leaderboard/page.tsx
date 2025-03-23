'use client';

import { useEffect, useState } from 'react';
import { getAllUsers } from '../firebase/firestoreOperations';
import { YamlrgUserProfile } from '../types';
import Image from 'next/image';
import { StarIcon } from '@heroicons/react/24/solid';
import ProtectedPage from '@/components/ProtectedPage';
import RulesModal from '@/components/RulesModal';

export default function LeaderboardPage() {
  const [users, setUsers] = useState<YamlrgUserProfile[]>([]);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Group users by points
  const usersByPoints = users.reduce((acc, user) => {
    const points = user.points || 0;
    if (points === 0) return acc;
    if (!acc[points]) {
      acc[points] = [];
    }
    acc[points].push(user);
    return acc;
  }, {} as Record<number, YamlrgUserProfile[]>);

  // Get unique point values and sort them in descending order
  const pointValues = Object.keys(usersByPoints)
    .map(Number)
    .sort((a, b) => b - a);

  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await getAllUsers();
      const usersWithPoints = allUsers.filter(user => 
        // Only show users with points AND who are visible in members directory
        (user.points || 0) > 0 && user.showInMembers
      );
      setUsers(usersWithPoints);
    };

    fetchUsers();
  }, []);

  return (
    <ProtectedPage>
      <main className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="text-emerald-600 hover:text-emerald-700 hover:underline text-sm"
            >
              Rules
            </button>
          </div>

          <div className="bg-white rounded-lg shadow divide-y">
            {pointValues.map((points, rankIndex) => (
              <div 
                key={points}
                className="p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl font-mono text-gray-500">
                    {rankIndex + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <StarIcon className="w-5 h-5 text-yellow-400" />
                    <span className="text-lg font-semibold">{points}</span>
                    <span className="text-gray-500 text-sm">pts</span>
                  </div>
                </div>
               
                <div className="flex flex-wrap gap-4">
                  {usersByPoints[points].map(user => (
                    <div key={user.uid} className="flex items-center gap-3">
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName ?? 'User'}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-lg text-emerald-700">
                            {user.displayName?.[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{user.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <RulesModal 
            isOpen={isRulesModalOpen} 
            onClose={() => setIsRulesModalOpen(false)} 
          />
        </div>
      </main>
    </ProtectedPage>
  );
} 
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import { YamlrgUserProfile } from '@/app/types';
import Image from 'next/image';
import { UserIcon } from '@heroicons/react/24/outline';

// Helper function to chunk array into groups of n
const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
};

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<YamlrgUserProfile[]>([]);

  useEffect(() => {
    const fetchTopUsers = async () => {
      const q = query(
        collection(db, 'users'),
        orderBy('points', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      setTopUsers(snapshot.docs.map(doc => ({ 
        ...doc.data(),
        uid: doc.id
      })) as YamlrgUserProfile[]);
    };

    fetchTopUsers();
  }, []);

  // Group users by points
  const groupedUsers = topUsers.reduce((acc, user, index) => {
    const points = user.points || 0;
    if (!acc[points]) {
      acc[points] = {
        rank: new Set(topUsers.slice(0, index).map(u => u.points || 0)).size + 1,
        users: []
      };
    }
    acc[points].users.push(user);
    return acc;
  }, {} as Record<number, { rank: number; users: YamlrgUserProfile[] }>);

  // Sort by points in descending order
  const sortedGroups = Object.entries(groupedUsers)
    .sort(([pointsA], [pointsB]) => Number(pointsB) - Number(pointsA));

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="space-y-2">
        {sortedGroups.map(([points, { rank, users }]) => {
          // Split users into groups of 3
          const userRows = chunkArray(users, 3);
          
          return (
            <div 
              key={points}
              className="px-6 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-6 text-gray-500">
                  {rank}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xl text-yellow-600">{points}</span>
                  <span className="text-sm text-gray-500">pts</span>
                </div>
              </div>
              
              <div className="space-y-3 pl-6">
                {userRows.map((rowUsers, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-4">
                    {rowUsers.map(user => (
                      <div key={user.uid} className="flex items-center gap-2">
                        {user.photoURL ? (
                          <Image
                            src={user.photoURL || '/default-avatar.png'}
                            alt={user.displayName || 'User'}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="font-medium">{user.displayName}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 
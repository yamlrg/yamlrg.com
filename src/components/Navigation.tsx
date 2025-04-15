'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../app/firebase/firebaseConfig';
import { Menu } from '@headlessui/react';
import { getUserProfile } from '../app/firebase/firestoreOperations';
import { YamlrgUserProfile } from '../app/types';
import { ADMIN_EMAILS } from '../app/config/admin';
import { 
  UserGroupIcon, 
  RocketLaunchIcon,
  PresentationChartBarIcon,
  UserIcon, 
  Bars3Icon, 
  StarIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export default function Navigation() {
  const [user, loading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<YamlrgUserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    };

    fetchUserProfile();
  }, [user]);

  const protectedNavItems = [
    { href: '/members', label: 'Members', icon: <UserGroupIcon className="w-6 h-6" /> },
    { href: '/gradient-connect', label: 'Gradient Connect', icon: <RocketLaunchIcon className="w-6 h-6" /> },
    { href: '/workshops', label: 'Workshops', icon: <PresentationChartBarIcon className="w-6 h-6" /> },
    { href: '/profile', label: 'Profile', icon: <UserIcon className="w-6 h-6" /> },
  ];

  if (loading || !user) {
    return (
      <nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-800">
                YAMLRG
              </Link>
            </div>
            {!loading && (
              <div className="flex items-center">
                <Link href="/login" className="text-gray-700 hover:text-gray-900">
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-800">
              YAMLRG
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:gap-6">
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
            >
              <StarIcon className="w-5 h-5" />
              <span className="font-medium">{userProfile?.points || 0}</span>
              <span className="text-sm">Points</span>
            </Link>
            {protectedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex items-center justify-center p-2 text-gray-600 hover:text-emerald-700 transition-colors"
              >
                {item.icon}
                <span className="absolute top-full mt-1 whitespace-nowrap bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.label}
                </span>
              </Link>
            ))}
            {user?.email && ADMIN_EMAILS.includes(user.email) && (
              <Link
                href="/admin"
                className="group relative flex items-center justify-center p-2 text-gray-600 hover:text-emerald-700 transition-colors"
              >
                <ShieldCheckIcon className="w-6 h-6" />
                <span className="absolute top-full mt-1 whitespace-nowrap bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Admin
                </span>
              </Link>
            )}
            <Link
              href="/logout"
              className="group relative flex items-center justify-center p-2 text-gray-600 hover:text-emerald-700 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-6 h-6" />
              <span className="absolute top-full mt-1 whitespace-nowrap bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Sign out
              </span>
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <Link
              href="/leaderboard"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
            >
              <StarIcon className="w-4 h-4" />
              <span className="font-medium text-sm">{userProfile?.points || 0}</span>
            </Link>
            <Menu as="div" className="relative z-50">
              <Menu.Button className="p-2 text-gray-600 hover:text-gray-900">
                <Bars3Icon className="h-6 w-6" />
              </Menu.Button>

              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                {protectedNavItems.map((item) => (
                  <Menu.Item key={item.href}>
                    {({ active }) => (
                      <Link
                        href={item.href}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        {item.icon}
                        <span className="ml-2">{item.label}</span>
                      </Link>
                    )}
                  </Menu.Item>
                ))}
                {user?.email && ADMIN_EMAILS.includes(user.email) && (
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/admin"
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        <ShieldCheckIcon className="w-5 h-5 mr-2" />
                        Admin
                      </Link>
                    )}
                  </Menu.Item>
                )}
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/logout"
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex items-center px-4 py-2 text-sm text-gray-700`}
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                      Sign out
                    </Link>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  );
} 
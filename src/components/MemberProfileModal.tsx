'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  BuildingOfficeIcon, 
  EnvelopeIcon, 
  UserIcon,
  ChatBubbleLeftIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { YamlrgUserProfile } from '@/app/types';
import Image from 'next/image';
import { FaLinkedin, FaWhatsapp } from 'react-icons/fa';
import { formatLinkedInUrl } from '@/utils/linkedin';
import { toast } from 'react-hot-toast';
import { ADMIN_EMAILS } from '@/app/config/admin';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/firebaseConfig';
import { getFirestore, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

interface GradientConnectEvent {
  id: string;
  date: string;
  status: 'upcoming' | 'completed';
}

interface Props {
  member: YamlrgUserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberProfileModal({ member, isOpen, onClose }: Props) {
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [upcomingEvent, setUpcomingEvent] = useState<GradientConnectEvent | null>(null);
  const [hasSignedUp, setHasSignedUp] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setIsAdmin(ADMIN_EMAILS.includes(user.email));
    }
  }, [user]);

  useEffect(() => {
    const checkGradientConnectStatus = async () => {
      try {
        const db = getFirestore();
        const eventsRef = collection(db, 'gradientConnectEvents');
        const eventsSnapshot = await getDocs(eventsRef);

        // Get the nearest upcoming event
        const events = eventsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as GradientConnectEvent))
          .filter(event => event.status === 'upcoming')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (events.length === 0) {
          setUpcomingEvent(null);
          return;
        }

        const nextEvent = events[0];
        setUpcomingEvent(nextEvent);

        // Check if member has signed up for this event
        const signupsRef = collection(db, 'gradientConnectSignups');
        const signupQuery = query(
          signupsRef,
          where('userId', '==', member.uid),
          where('matchingDate', '==', nextEvent.date)
        );
        
        const signupSnapshot = await getDocs(signupQuery);
        setHasSignedUp(!signupSnapshot.empty);
      } catch (error) {
        console.error('Error checking Gradient Connect status:', error);
      }
    };

    if (isAdmin) {
      checkGradientConnectStatus();
    }
  }, [isAdmin, member.uid]);

  const handleGradientConnectSignup = async () => {
    if (!upcomingEvent) {
      toast.error('No upcoming Gradient Connect event found');
      return;
    }

    try {
      const db = getFirestore();
      const signupsRef = collection(db, 'gradientConnectSignups');
      
      // Check if already signed up
      const existingQuery = query(
        signupsRef,
        where('userId', '==', member.uid),
        where('matchingDate', '==', upcomingEvent.date)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        toast.error('Member is already signed up for this event');
        return;
      }

      // Create new signup
      await addDoc(signupsRef, {
        userId: member.uid,
        userEmail: member.email,
        userName: member.displayName,
        matchingDate: upcomingEvent.date,
        status: {
          inviteSent: false,
          inviteAccepted: false,
          matched: false,
          matchedWith: null,
          matchedWithName: null
        },
        createdAt: new Date().toISOString()
      });

      setHasSignedUp(true);
      toast.success('Member signed up for Gradient Connect successfully');
    } catch (error) {
      console.error('Error signing up for Gradient Connect:', error);
      toast.error('Failed to sign up for Gradient Connect');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-8 shadow-xl">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-6 mb-8">
                {member.photoURL ? (
                  <Image
                    src={member.photoURL}
                    alt={member.displayName || ''}
                    width={96}
                    height={96}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-semibold mb-1">{member.displayName}</h2>
                  {member.role && (
                    <p className="text-gray-600 mb-1">{member.role}</p>
                  )}
                  {member.joinedAt && (
                    <p className="text-sm text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              {member.status && Object.values(member.status).some(v => v) && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-3">Your Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(member.status).map(([key, value]) => 
                      value ? (
                        <span
                          key={key}
                          className="px-4 py-1 bg-green-50 text-green-700 rounded-full"
                        >
                          {key === 'needsProjectHelp' ? 'Needs Project Help' :
                           key === 'offeringProjectHelp' ? 'Offering Project Help' :
                           key === 'openToNetworking' ? 'Open to Networking' :
                           key === 'lookingForCofounder' ? 'Looking for Co-founder' :
                           key === 'isHiring' ? 'Hiring' :
                           key === 'seekingJob' ? 'Seeking Job' :
                           key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Company & Role */}
              {member.company && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-3">Company & Role</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                      <span className="font-medium">{member.company.name}</span>
                      {member.company.stage && (
                        <span className="text-sm text-gray-500">({member.company.stage})</span>
                      )}
                    </div>
                    {member.role && (
                      <p className="text-gray-600">{member.role}</p>
                    )}
                    {member.company.industry && (
                      <p className="text-sm text-gray-500">Industry: {member.company.industry}</p>
                    )}
                    {member.company.website && (
                      <a 
                        href={member.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm block"
                      >
                        {member.company.website}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Best Way to Reach */}
              {member.bestWayToReach && member.bestWayToReach.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-3">Best Way to Reach</h3>
                  <div className="space-y-3">
                    {/* Primary Contact Methods */}
                    <div className="flex gap-4 mb-2">
                      {member.showEmail && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(member.email);
                            toast.success('Email copied to clipboard!');
                          }}
                          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                          title={member.email}
                        >
                          <EnvelopeIcon className="w-5 h-5" />
                          <span>Copy Email</span>
                        </button>
                      )}
                      {member.linkedinUrl && (
                        <a
                          href={formatLinkedInUrl(member.linkedinUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-gray-600 hover:text-[#0077b5] transition-colors"
                        >
                          <FaLinkedin className="w-5 h-5" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                    </div>

                    {/* Other Contact Methods */}
                    {(() => {
                      // First, find if there's a WhatsApp number
                      const whatsappContact = member.bestWayToReach.find(
                        contact => typeof contact === 'object' && contact?.id === 'whatsapp'
                      );

                      // Then process all contact methods
                      const processedContacts = member.bestWayToReach
                        .filter(contact => {
                          // Skip string 'whatsapp' if we have a WhatsApp number
                          if (typeof contact === 'string' && contact.toLowerCase() === 'whatsapp' && whatsappContact) {
                            return false;
                          }
                          // Skip email and linkedin as they're handled above
                          if (typeof contact === 'string' && ['email', 'linkedin', 'other'].includes(contact.toLowerCase())) {
                            return false;
                          }
                          return true;
                        })
                        .map((contact, index) => {
                          if (typeof contact === 'string') {
                            const getIcon = (type: string) => {
                              switch (type.toLowerCase()) {
                                case 'whatsapp':
                                  return <FaWhatsapp className="w-5 h-5 text-green-500" />;
                                case 'any!':
                                  return <ChatBubbleLeftIcon className="w-5 h-5 text-purple-500" />;
                                default:
                                  return <GlobeAltIcon className="w-5 h-5 text-gray-500" />;
                              }
                            };

                            return (
                              <div key={`string-${contact}-${index}`} className="flex items-center gap-2 text-gray-600">
                                {getIcon(contact)}
                                <span className="capitalize">{contact}</span>
                              </div>
                            );
                          }

                          if (contact && typeof contact === 'object' && contact.id === 'whatsapp' && contact.value) {
                            const cleanNumber = contact.value.replace(/\D/g, '');
                            return (
                              <a
                                key={`object-${contact.id}-${index}`}
                                href={`https://wa.me/${cleanNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                              >
                                <FaWhatsapp className="w-5 h-5 text-green-500" />
                                <span className="hover:underline">WhatsApp: {contact.value}</span>
                              </a>
                            );
                          }

                          return null;
                        });

                      return processedContacts;
                    })()}
                  </div>
                </div>
              )}

              {/* Investor Status */}
              {member.isInvestor && (
                <div className="mb-8">
                  <span className="inline-flex items-center px-4 py-1 bg-yellow-50 text-yellow-800 rounded-full">
                    <span className="mr-2">💰</span>
                    Investor
                  </span>
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && upcomingEvent && (
                <div className="mb-8 pt-4 border-t">
                  <h3 className="text-lg font-medium mb-3">Admin Actions</h3>
                  <div className="flex items-center gap-4">
                    {hasSignedUp ? (
                      <div className="text-emerald-600 font-medium">
                        ✓ Signed up for Gradient Connect on {new Date(upcomingEvent.date).toLocaleDateString()}
                      </div>
                    ) : (
                      <button
                        onClick={handleGradientConnectSignup}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        Sign up for Gradient Connect
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Interests */}
              {member.interests && member.interests.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {member.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-4 py-1 bg-blue-50 text-blue-700 rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Looking For */}
              {member.lookingFor && Object.values(member.lookingFor).some(v => v) && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-3">Looking For</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(member.lookingFor).map(([key, value]) => 
                      value ? (
                        <span
                          key={key}
                          className="px-4 py-1 bg-purple-50 text-purple-700 rounded-full"
                        >
                          {key === 'wannabeFounders' ? 'Wannabe Founders' :
                           key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 
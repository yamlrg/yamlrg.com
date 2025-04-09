'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { UserGroupIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { GradientConnectSignup } from '@/app/types';
import { UserCard } from './UserCard';
import { TeamNotesModal } from './TeamNotesModal';

interface Props {
  id: string;
  teamNumber: string;
  members: GradientConnectSignup[];
  notes?: string | null;
  previouslyPaired?: boolean;
  onNotesChange: (notes: string) => void;
  onNotesDelete: () => void;
  onInviteSentToggle?: (userId: string) => void;
  onInviteAcceptedToggle?: (userId: string) => void;
  onDelete?: () => void;
}

export function DroppableTeam({ id, teamNumber, members, notes, previouslyPaired, onNotesChange, onNotesDelete, onInviteSentToggle, onInviteAcceptedToggle, onDelete }: Props) {
  const [showNotesModal, setShowNotesModal] = useState(false);
  
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'team',
      accepts: ['user']
    }
  });

  const isFull = members.length >= 2;

  const handleRemove = (memberId: string) => {
    console.log('Removing member:', memberId, 'from team:', id);
    const event = new CustomEvent('removeFromTeam', {
      detail: { memberId, teamId: id }
    });
    window.dispatchEvent(event);
  };

  return (
    <>
      <div 
        ref={setNodeRef}
        className={`bg-white p-4 rounded-lg shadow min-h-[120px] transition-colors
          ${isOver && !isFull ? 'bg-blue-50 ring-2 ring-blue-500 ring-opacity-50' : ''}
          ${isFull ? 'bg-gray-50' : ''}
          ${previouslyPaired && members.length === 2 ? 'border-2 border-red-400 border-solid' : ''}`}
      >
        <h3 className="font-medium mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-gray-400" />
            Team {teamNumber}
            {previouslyPaired && members.length === 2 && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                Previously Paired
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotesModal(true)}
              className="p-1 hover:bg-gray-100 rounded-full"
              title="Add/Edit Notes"
            >
              <PencilIcon className="h-4 w-4 text-gray-500" />
            </button>
            {isFull && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                Full
              </span>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 hover:bg-red-100 rounded-full"
                title="Delete Team"
              >
                <XMarkIcon className="h-4 w-4 text-red-500" />
              </button>
            )}
          </div>
        </h3>
        <div className="space-y-2">
          {members.map((member) => (
            <UserCard 
              key={member.id}
              user={member} 
              inTeam={true}
              onRemove={() => handleRemove(member.id!)}
              onInviteSentToggle={() => onInviteSentToggle?.(member.id!)}
              onInviteAcceptedToggle={() => onInviteAcceptedToggle?.(member.id!)}
            />
          ))}
        </div>
        {notes && (
          <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-100 group relative">
            <button
              onClick={onNotesDelete}
              className="absolute top-1 right-1 p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete notes"
            >
              <XMarkIcon className="h-4 w-4 text-red-500" />
            </button>
            <div className="pr-6">
              {notes}
            </div>
          </div>
        )}
      </div>

      {showNotesModal && (
        <TeamNotesModal
          teamId={teamNumber}
          currentNotes={notes}
          onSave={onNotesChange}
          onClose={() => setShowNotesModal(false)}
        />
      )}
    </>
  );
} 
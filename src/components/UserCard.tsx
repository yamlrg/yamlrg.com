'use client';

import { GradientConnectSignup } from '@/app/types';
import { EnvelopeIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  user: GradientConnectSignup;
  onRemove?: () => void;  // Optional remove handler
  inTeam?: boolean;       // To show remove button only in teams
  onInviteSentToggle?: () => void;
  onInviteAcceptedToggle?: () => void;
}

export function UserCard({ user, onRemove, inTeam, onInviteSentToggle, onInviteAcceptedToggle }: Props) {
  return (
    <div className="bg-gray-50 p-2 rounded mb-2 text-sm group relative">
      <div className="flex items-center justify-between">
        <span>{user.userName}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInviteSentToggle?.();
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <EnvelopeIcon 
              className={`h-4 w-4 ${
                user.status.inviteSent 
                  ? 'text-green-500' 
                  : 'text-gray-300'
              }`}
              title={user.status.inviteSent ? "Invite sent" : "Invite not sent"}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInviteAcceptedToggle?.();
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <CheckIcon 
              className={`h-4 w-4 ${
                user.status.inviteAccepted 
                  ? 'text-green-500' 
                  : 'text-gray-300'
              }`}
              title={user.status.inviteAccepted ? "Attending" : "Not confirmed"}
            />
          </button>
          {inTeam && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="ml-2 p-1 hover:bg-red-100 rounded-full group-hover:opacity-100 opacity-0 transition-opacity"
              title="Remove from team"
            >
              <XMarkIcon className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 
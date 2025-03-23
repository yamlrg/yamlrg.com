'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { GradientConnectSignup } from '@/app/types';
import { UserCard } from './UserCard';

interface Props {
  id: string;
  items: GradientConnectSignup[];
  onInviteSentToggle?: (userId: string) => void;
  onInviteAcceptedToggle?: (userId: string) => void;
}

export function DroppableArea({ id, items, onInviteSentToggle, onInviteAcceptedToggle }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'unassigned',
      accepts: ['user']
    }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-white p-4 rounded-lg shadow transition-colors min-h-[120px]
        ${isOver ? 'bg-blue-50 ring-2 ring-blue-500 ring-opacity-50' : ''}`}
    >
      <SortableContext
        items={items.map(s => s.id!)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id!}>
            <UserCard 
              user={item}
              onInviteSentToggle={() => onInviteSentToggle?.(item.id!)}
              onInviteAcceptedToggle={() => onInviteAcceptedToggle?.(item.id!)}
            />
          </SortableItem>
        ))}
      </SortableContext>
    </div>
  );
} 
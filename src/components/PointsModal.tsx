import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { POINTS } from '@/app/config/points';

interface PointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (points: number, reason: string) => void;
  mode: 'add' | 'remove';
}

const POINT_REASONS = {
  // Participation
  'GRADIENT_CONNECT_SIGNUP': 'Gradient Connect signup',
  'GRADIENT_CONNECT_ATTENDANCE': 'Gradient Connect attendance',
  
  // Content
  'READING_LIST_ADD': 'Reading list addition',
  'WORKSHOP_PRESENTATION': 'Workshop presentation',
  'WORKSHOP_ATTENDANCE': 'Workshop attendance',
  'WORKSHOP_QUESTION': 'Great question during workshop',
  
  // Profile
  'PROFILE_COMPLETION': 'Profile completion',
  'JOIN_REQUEST_APPROVED': 'Join request approved',
  
  // Engagement
  'FIRST_LOGIN_STREAK': 'First 4-week login streak',
  'WEEKLY_LOGIN': 'Weekly login',
  
  // Manual Adjustments
  'ADMIN_ADJUSTMENT': 'Administrative adjustment',
  'INAPPROPRIATE_BEHAVIOR': 'Inappropriate behavior',
} as const;

export default function PointsModal({ isOpen, onClose, onSubmit, mode }: PointsModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [points, setPoints] = useState<number>(0);

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
    // Set default points based on reason
    if (reason === 'ADMIN_ADJUSTMENT' || reason === 'INAPPROPRIATE_BEHAVIOR') {
      setPoints(0);
    } else {
      setPoints(POINTS[reason as keyof typeof POINTS] || 0);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(points, selectedReason);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={() => {
          onClose();
          setSelectedReason('');
          setPoints(0);
        }}
      >
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
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <div className="flex justify-between items-start">
                  <Dialog.Title className="text-xl font-semibold">
                    {mode === 'add' ? 'Add Points' : 'Remove Points'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Reason
                    </label>
                    <select
                      value={selectedReason}
                      onChange={(e) => handleReasonChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="">Select a reason...</option>
                      {Object.entries(POINT_REASONS)
                        .filter(([key]) => 
                          mode === 'add' 
                            ? !key.includes('INAPPROPRIATE')
                            : key === 'INAPPROPRIATE_BEHAVIOR' || key === 'ADMIN_ADJUSTMENT'
                        )
                        .map(([key, label]) => (
                          <option key={key} value={key}>
                            {label} {key !== 'ADMIN_ADJUSTMENT' && key !== 'INAPPROPRIATE_BEHAVIOR' 
                              ? `(${POINTS[key as keyof typeof POINTS]} pts)` 
                              : ''}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {selectedReason && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Points
                      </label>
                      <input
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                        min="0"
                        required
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-4 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedReason}
                      className={`px-4 py-2 text-white rounded ${
                        mode === 'add' 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      } disabled:opacity-50`}
                    >
                      {mode === 'add' ? 'Add' : 'Remove'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 
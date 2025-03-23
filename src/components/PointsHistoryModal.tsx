import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { YamlrgUserProfile } from '@/app/types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import { toast } from 'react-hot-toast';

interface PointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: YamlrgUserProfile;
  onUpdate: () => void;
}

const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function PointsHistoryModal({ isOpen, onClose, user, onUpdate }: PointsHistoryModalProps) {
  const handleDeleteEntry = async (index: number) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() as YamlrgUserProfile;
      
      // Remove the entry and recalculate points
      const newHistory = [...(userData.pointsHistory || [])];
      const deletedEntry = newHistory.splice(index, 1)[0];
      
      // Calculate new total points
      const newTotal = (userData.points || 0) - deletedEntry.points;

      // Update Firestore
      await updateDoc(userRef, {
        points: newTotal,
        pointsHistory: newHistory
      });

      onUpdate(); // Refresh the users list
      toast.success('Points entry deleted successfully');
    } catch (error) {
      console.error('Error deleting points entry:', error);
      toast.error('Failed to delete points entry');
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
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Dialog.Title className="text-xl font-semibold">
                      Points History
                    </Dialog.Title>
                    <p className="text-sm text-gray-500">
                      {user.displayName} • Total: {user.points || 0} points
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {user.pointsHistory?.length ? (
                    user.pointsHistory
                      .slice()
                      .reverse()
                      .map((history, index) => (
                        <div 
                          key={index}
                          className="flex items-start justify-between py-2 border-b last:border-0"
                        >
                          <div>
                            <p className="font-medium">
                              {history.action.split('_').join(' ').toLowerCase()}
                              {history.reason && ` - ${history.reason}`}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(history.timestamp)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-medium ${
                              history.points > 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {history.points > 0 ? '+' : ''}{history.points}
                            </span>
                            <button
                              onClick={() => handleDeleteEntry(user.pointsHistory!.length - 1 - index)}
                              className="text-gray-400 hover:text-red-600 p-1"
                              title="Delete entry"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No points history available
                    </p>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 
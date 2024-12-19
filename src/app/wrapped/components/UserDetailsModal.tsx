import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface UserDetailsProps {
  user: {
    name: string
    message_count: number
    emoji_count: number
    active_hours: { [key: string]: number }
  }
  onClose: () => void
}

export default function UserDetailsModal({ user, onClose }: UserDetailsProps) {
  // Convert active_hours object to array for chart
  const hourData = Object.entries(user.active_hours).map(([hour, count]) => ({
    hour: `${hour}:00`,
    messages: count,
  })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{user.name}&apos;s Stats</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold">Messages</h3>
              <p className="text-2xl">{user.message_count}</p>
            </div>
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold">Emojis Used</h3>
              <p className="text-2xl">{user.emoji_count}</p>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <h3 className="text-lg font-semibold mb-4">Activity by Hour</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="messages" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
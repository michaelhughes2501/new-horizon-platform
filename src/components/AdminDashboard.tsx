/**
 * Universal Dashboard Component
 * Works with React/Vite projects
 */

import React, { useState, useEffect } from 'react';

interface DashboardStats {
  total_users: number;
  total_messages: number;
  total_posts: number;
  total_matches: number;
  active_users_week: number;
  new_users_week: number;
  messages_week: number;
  engagement_rate: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  last_login?: string;
  matches: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'users' | 'activity'>('overview');

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/dashboard/users?page=1&per_page=10');
      const data = await res.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 border-b">
        {(['overview', 'users', 'activity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-semibold ${
              tab === t
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Users"
            value={stats.total_users}
            trend={`+${stats.new_users_week} this week`}
          />
          <StatCard
            label="Active Users (Week)"
            value={stats.active_users_week}
            trend={`${stats.engagement_rate.toFixed(1)}% engagement`}
          />
          <StatCard
            label="Total Messages"
            value={stats.total_messages}
            trend={`+${stats.messages_week} this week`}
          />
          <StatCard
            label="Matches"
            value={stats.total_matches}
            trend={`${stats.total_posts} forum posts`}
          />
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Username</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Joined</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Matches</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{user.username}</td>
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">{user.matches}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Tab */}
      {tab === 'activity' && (
        <ActivityFeed />
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  trend: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <p className="text-gray-600 text-sm mb-2">{label}</p>
    <p className="text-3xl font-bold mb-2">{value.toLocaleString()}</p>
    <p className="text-sm text-green-600">{trend}</p>
  </div>
);

interface ActivityItem {
  type: 'message' | 'post' | string;
  user: string;
  action: string;
  timestamp: string;
}

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/dashboard/activity-log?limit=20');
        const data = await res.json();
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activity:', error);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-4 flex items-start gap-4">
          <div
            className={`w-2 h-2 rounded-full mt-2 ${
              activity.type === 'message'
                ? 'bg-blue-500'
                : activity.type === 'post'
                  ? 'bg-green-500'
                  : 'bg-purple-500'
            }`}
          />
          <div className="flex-1">
            <p className="font-semibold">{activity.user}</p>
            <p className="text-gray-600 text-sm">{activity.action}</p>
            <p className="text-gray-400 text-xs mt-1">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;

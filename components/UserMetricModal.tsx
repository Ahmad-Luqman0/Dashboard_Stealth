import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { db } from '../services/dataService';

interface UserMetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: 'productive' | 'unproductive' | 'neutral' | 'idle' | 'total_time' | null;
  selectedRange: string;
  selectedShift: string;
}

interface UserMetricData {
  user_id: number;
  name: string;
  email: string;
  productive_time: number;
  unproductive_time: number;
  neutral_time: number;
  idle_time: number;
  total_time: number;
}

const UserMetricModal: React.FC<UserMetricModalProps> = ({
  isOpen,
  onClose,
  metricType,
  selectedRange,
  selectedShift,
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserMetricData[]>([]);

  useEffect(() => {
    if (isOpen && metricType) {
      fetchUserMetrics();
    }
  }, [isOpen, metricType, selectedRange, selectedShift]);

  const fetchUserMetrics = async () => {
    setLoading(true);
    try {
      const breakdown = await db.getUserActivityBreakdown(
        selectedRange,
        selectedShift === 'All' ? undefined : selectedShift
      );
      
      if (Array.isArray(breakdown)) {
        // Sort users based on the selected metric, highest to lowest
        const sorted = [...breakdown].sort((a, b) => {
          const aValue = getMetricValue(a);
          const bValue = getMetricValue(b);
          return bValue - aValue;
        });
        setUsers(sorted);
      }
    } catch (e) {
      console.error('Error fetching user metrics:', e);
    }
    setLoading(false);
  };

  const getMetricValue = (user: UserMetricData): number => {
    switch (metricType) {
      case 'productive':
        return Number(user.productive_time || 0);
      case 'unproductive':
        return Number(user.unproductive_time || 0);
      case 'neutral':
        return Number(user.neutral_time || 0);
      case 'idle':
        return Number(user.idle_time || 0);
      case 'total_time':
        return Number(user.total_time || 0);
      default:
        return 0;
    }
  };

  const formatDuration = (seconds?: number | string) => {
    if (!seconds) return '0h 0m';
    const sec = Number(seconds);
    if (isNaN(sec)) return '0h 0m';
    
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getMetricLabel = () => {
    switch (metricType) {
      case 'productive':
        return 'Productive Time';
      case 'unproductive':
        return 'Unproductive Time';
      case 'neutral':
        return 'Neutral & Unrated Time';
      case 'idle':
        return 'Idle Time';
      case 'total_time':
        return 'Total Time Tracked';
      default:
        return 'Metric';
    }
  };

  const getMetricColor = () => {
    switch (metricType) {
      case 'productive':
        return 'text-green-600';
      case 'unproductive':
        return 'text-red-600';
      case 'neutral':
        return 'text-blue-600';
      case 'idle':
        return 'text-orange-600';
      case 'total_time':
        return 'text-slate-600';
      default:
        return 'text-slate-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            Users by {getMetricLabel()}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          ) : users.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {users.map((user, index) => {
                const metricValue = getMetricValue(user);
                const percentage = user.total_time > 0 
                  ? ((metricValue / user.total_time) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div
                    key={user.user_id}
                    className="p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-block w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-800">{user.name}</h3>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getMetricColor()}`}>
                          {formatDuration(metricValue)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {percentage}% of total time
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          metricType === 'productive'
                            ? 'bg-green-500'
                            : metricType === 'unproductive'
                            ? 'bg-red-500'
                            : metricType === 'neutral'
                            ? 'bg-blue-500'
                            : metricType === 'idle'
                            ? 'bg-orange-500'
                            : 'bg-slate-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    {/* Selected Metric Breakdown */}
                    <div className="mt-3 bg-slate-50 p-3 rounded">
                      <div className="text-xs text-slate-500 mb-2">Breakdown</div>
                      <div className="text-sm font-bold text-slate-800">
                        {metricType === 'productive' && `Productive: ${formatDuration(user.productive_time)}`}
                        {metricType === 'unproductive' && `Unproductive: ${formatDuration(user.unproductive_time)}`}
                        {metricType === 'neutral' && `Neutral: ${formatDuration(user.neutral_time)}`}
                        {metricType === 'idle' && `Idle: ${formatDuration(user.idle_time)}`}
                        {metricType === 'total_time' && `Total Tracked: ${formatDuration(user.total_time)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-500">No data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMetricModal;

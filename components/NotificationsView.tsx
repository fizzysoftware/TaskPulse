
import React from 'react';
import { Notification } from '../types';
import { Bell, CheckCircle2, MessageSquare, Info, Clock, Check, Inbox } from 'lucide-react';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onMarkRead, onMarkAllRead }) => {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'TASK_ASSIGNED': return <Bell size={18} className="text-blue-500" />;
      case 'TASK_COMPLETED': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'COMMENT': return <MessageSquare size={18} className="text-blue-500" />;
      default: return <Info size={18} className="text-gray-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="animate-fade-in pb-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-1">Recent Activity</h2>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-primary rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            <Check size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Inbox size={40} className="text-gray-200" />
            </div>
            <p className="font-semibold text-gray-900">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No new notifications to show</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id}
              onClick={() => onMarkRead(notification.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                  notification.read 
                    ? 'bg-white border-gray-100 opacity-70 grayscale-[0.5]' 
                    : 'bg-white border-blue-100 shadow-md shadow-blue-50/50'
              }`}
            >
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${notification.read ? 'bg-gray-50' : 'bg-blue-50'}`}>
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm ${notification.read ? 'font-medium text-gray-600' : 'font-bold text-gray-900'}`}>
                    {notification.title}
                    </p>
                    {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse"></div>
                    )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-2">{notification.message}</p>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                  <Clock size={10} />
                  {/* Fixed: changed timestamp to notification.timestamp */}
                  <span>{formatTime(notification.timestamp)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsView;

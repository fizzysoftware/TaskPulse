import React, { useState, useRef, useEffect } from 'react';
import { Users, CheckSquare, BarChart2, PlusCircle, MoreVertical, UserPlus, Mic, MessageSquare, Settings, LogOut, Bell } from 'lucide-react';
import { User, UserRole, Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  onQuickAdd: () => void;
  onAddMember: () => void;
  onSettings: () => void;
  onVoiceCreate: () => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  pageTitle: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  currentTab, 
  setCurrentTab, 
  onQuickAdd, 
  onAddMember, 
  onSettings, 
  onVoiceCreate, 
  onLogout, 
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  pageTitle 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Explicitly define management privileges for both Manager and Owner
  const isManagement = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.OWNER;

  // Handle clicking outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-gray-200">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-lg font-bold text-gray-900 leading-tight truncate flex-1">{pageTitle}</h1>
        
        <div className="flex items-center gap-1">
          {/* Notifications Button - Now switches tab */}
          <button 
            onClick={() => {
              setCurrentTab('notifications');
              setIsMenuOpen(false);
            }} 
            className={`p-2 transition-colors rounded-full relative ${currentTab === 'notifications' ? 'bg-blue-50 text-primary' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
          </button>

          {/* More Menu Button */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
              }} 
              className={`p-2 transition-colors rounded-full ${isMenuOpen ? 'bg-gray-100 text-primary' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            >
                <MoreVertical size={24} />
            </button>

            {/* Header Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in origin-top-right">
                {isManagement && (
                  <button
                    onClick={() => {
                      setCurrentTab('team');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${currentTab === 'team' ? 'text-primary bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Users size={18} />
                    <span className="font-medium">Team</span>
                  </button>
                )}
                {isManagement && (
                  <button
                    onClick={() => {
                      setCurrentTab('dashboard');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${currentTab === 'dashboard' ? 'text-primary bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <BarChart2 size={18} />
                    <span className="font-medium">Stats</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setCurrentTab('settings');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${currentTab === 'settings' ? 'text-primary bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <Settings size={18} />
                  <span className="font-medium">Settings</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-medium">Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-20 p-4">
        {children}
      </main>

      {/* Floating Action Buttons */}
      {currentTab === 'tasks' && (
        <div className="absolute bottom-20 right-4 flex flex-col gap-3 z-30">
             <button
              onClick={onVoiceCreate}
              className="bg-blue-500 text-white p-3.5 rounded-full shadow-lg hover:bg-blue-600 transition-transform active:scale-95 flex items-center justify-center animate-scale-in"
              aria-label="Create Task with Voice"
              title="Create with Voice"
            >
              <Mic size={22} />
            </button>

            <button
              onClick={onQuickAdd}
              className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95 flex items-center justify-center animate-scale-in"
              aria-label="Add Task"
            >
              <PlusCircle size={24} />
            </button>
        </div>
      )}

      {currentTab === 'team' && isManagement && (
        <button
          onClick={onAddMember}
          className="absolute bottom-20 right-4 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95 z-30 flex items-center justify-center animate-scale-in"
          aria-label="Add Member"
        >
          <UserPlus size={24} />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 absolute bottom-0 w-full z-20 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setCurrentTab('tasks')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentTab === 'tasks' ? 'text-primary' : 'text-gray-400'}`}
          >
            <CheckSquare size={20} />
            <span className="text-[10px] font-medium">Tasks</span>
          </button>

          <button
            onClick={() => setCurrentTab('chat')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentTab === 'chat' ? 'text-primary' : 'text-gray-400'}`}
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-medium">AI Chat</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
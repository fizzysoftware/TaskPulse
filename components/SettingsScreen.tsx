import React from 'react';
import { User, UserRole } from '../types';
import { LogOut, UserCircle, Shield, Camera } from 'lucide-react';

interface SettingsScreenProps {
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onLogout, onUpdateUser }) => {
  
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              onUpdateUser({
                  ...currentUser,
                  avatar: base64String
              });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center mt-4">
          <div className="relative mb-4">
              {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-white" />
              ) : (
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg border-2 border-white ${currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.OWNER ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                    {currentUser.initials}
                </div>
              )}
              
              {/* Camera Upload Button Overlay */}
              <label className="absolute bottom-0 right-0 bg-gray-900 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-gray-800 transition-colors active:scale-95">
                  <Camera size={16} />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </label>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900">{currentUser.name}</h3>
          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-gray-100 rounded-full">
            <Shield size={12} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{currentUser.role}</span>
          </div>
          {currentUser.department && (
              <p className="text-sm text-gray-500 mt-2">{currentUser.department}</p>
          )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-4 flex items-center gap-3 border-b border-gray-100">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                  <UserCircle size={20} />
              </div>
              <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Account ID</p>
                  <p className="text-xs text-gray-500 font-mono">{currentUser.id}</p>
              </div>
          </div>
           <div className="p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                  <Shield size={20} />
              </div>
              <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Department</p>
                  <p className="text-xs text-gray-500">{currentUser.department || 'Not Assigned'}</p>
              </div>
          </div>
      </div>

      <button 
        onClick={onLogout}
        className="w-full bg-red-50 text-red-600 font-semibold py-3.5 rounded-xl border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 transition-colors active:scale-95"
      >
        <LogOut size={20} />
        Log Out
      </button>

      <div className="text-center">
          <p className="text-xs text-gray-400">TeamSync v1.1.0</p>
      </div>
    </div>
  );
};

export default SettingsScreen;
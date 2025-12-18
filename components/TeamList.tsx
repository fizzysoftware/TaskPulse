import React, { useState } from 'react';
import { User, UserRole, UserStatus, Task } from '../types';
import { Edit2, Phone, X, Trash2, AlertTriangle, Save, Copy, Contact, RefreshCw, Power, Check, Bell, Clock, UserCheck, Briefcase } from 'lucide-react';

interface TeamListProps {
  users: User[];
  tasks: Task[];
  onAddUser: (name: string, role: UserRole, phoneNumber: string, department?: string) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string, deleteTasks: boolean) => void;
  isAdding: boolean;
  onCancelAdd: () => void;
  companyCode: string;
  isInviteEnabled: boolean;
  onToggleInvite: () => void;
  onRegenerateCode: () => void;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onRevokeInvite: (userId: string) => void;
  onRemindInvite: (userId: string) => void;
}

const TeamList: React.FC<TeamListProps> = ({ 
    users, 
    tasks, 
    onAddUser, 
    onUpdateUser, 
    onDeleteUser, 
    isAdding, 
    onCancelAdd, 
    companyCode,
    isInviteEnabled,
    onToggleInvite,
    onRegenerateCode,
    onApproveUser,
    onRejectUser,
    onRevokeInvite,
    onRemindInvite
}) => {
  // Add Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.EMPLOYEE);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.EMPLOYEE);
  
  // Delete Flow State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmitAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if(newName.trim() && newPhone.trim()) {
          onAddUser(newName, newRole, newPhone, newDepartment);
          setNewName('');
          setNewPhone('');
          setNewDepartment('');
          setNewRole(UserRole.EMPLOYEE);
      }
  };

  const handleEditClick = (user: User) => {
      setEditingUser(user);
      setEditName(user.name);
      setEditPhone(user.phoneNumber || '');
      setEditDepartment(user.department || '');
      setEditRole(user.role);
      setShowDeleteConfirm(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingUser && editName.trim()) {
          onUpdateUser({
              ...editingUser,
              name: editName,
              phoneNumber: editPhone,
              department: editDepartment,
              role: editRole,
              initials: editName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()
          });
          setEditingUser(null);
      }
  };

  const handleDeleteClick = () => {
      setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (deleteTasks: boolean) => {
      if (editingUser) {
          onDeleteUser(editingUser.id, deleteTasks);
          setEditingUser(null);
          setShowDeleteConfirm(false);
      }
  };

  const handleCopyCode = () => {
      navigator.clipboard.writeText(companyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleImportContacts = async () => {
    try {
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            alert("Contact import is not supported on this device.");
            return;
        }

        const props = ['name', 'tel'];
        const opts = { multiple: false };
        // @ts-ignore - The contacts API is not fully typed in standard lib yet
        const contacts = await navigator.contacts.select(props, opts);
        
        if (contacts && contacts.length > 0) {
            const contact = contacts[0];
            if (contact.name && contact.name.length > 0) {
                setNewName(contact.name[0]);
            }
            if (contact.tel && contact.tel.length > 0) {
                setNewPhone(contact.tel[0]);
            }
        }
    } catch (ex) {
        console.error("Error importing contacts", ex);
    }
  };

  // Group users by status
  const pendingRequests = users.filter(u => u.status === UserStatus.PENDING_APPROVAL);
  const invitedUsers = users.filter(u => u.status === UserStatus.INVITED);
  const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE);

  const userTaskCount = editingUser ? tasks.filter(t => t.assignedTo === editingUser.id).length : 0;

  return (
    <div className="space-y-6">
      {/* Company Code Card */}
      <div className={`rounded-2xl p-5 text-white shadow-lg transition-colors ${isInviteEnabled ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-800'}`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">Invite Members</h3>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${isInviteEnabled ? 'bg-green-400/20 border-green-400/30 text-green-100' : 'bg-red-400/20 border-red-400/30 text-red-200'}`}>
                        {isInviteEnabled ? 'Active' : 'Disabled'}
                    </div>
                </div>
                <p className={`text-sm mt-1 ${isInviteEnabled ? 'text-blue-100' : 'text-gray-400'}`}>
                    {isInviteEnabled ? 'Share this code with your team to let them join instantly.' : 'Invites are currently disabled.'}
                </p>
            </div>
            <button 
                onClick={onToggleInvite}
                className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${isInviteEnabled ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'}`}
                title={isInviteEnabled ? "Disable Invites" : "Enable Invites"}
            >
                <Power size={20} />
            </button>
          </div>
          
          {isInviteEnabled && (
            <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-3 flex items-center justify-between">
                <span className="font-mono text-xl tracking-widest font-bold ml-2">{companyCode}</span>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onRegenerateCode}
                        className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20 transition-colors"
                        title="Regenerate Code"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button 
                        onClick={handleCopyCode}
                        className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1 active:bg-gray-100"
                    >
                        {copied ? <span className="text-green-600">Copied!</span> : <><Copy size={14} /> Copy</>}
                    </button>
                </div>
            </div>
          )}
      </div>

      {isAdding && (
          <form onSubmit={handleSubmitAdd} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm animate-fade-in relative overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Add New Member</h3>
                  <button 
                     type="button" 
                     onClick={handleImportContacts}
                     className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                  >
                      <Contact size={14} />
                      Import Contact
                  </button>
              </div>
              
              <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    required
                    autoFocus
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number (Required)" 
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Department (e.g. Kitchen, Logistics)" 
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                  <div className="flex gap-2">
                      <div className="flex-1 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setNewRole(UserRole.EMPLOYEE)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newRole === UserRole.EMPLOYEE ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-500'}`}
                        >
                            Employee
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewRole(UserRole.MANAGER)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newRole === UserRole.MANAGER ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
                        >
                            Manager
                        </button>
                      </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onCancelAdd} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                          Cancel
                      </button>
                      <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
                          Invite
                      </button>
                  </div>
              </div>
          </form>
      )}

      {/* Join Requests Section */}
      {pendingRequests.length > 0 && (
          <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-1 flex items-center gap-2">
                  <UserCheck size={16} /> Join Requests ({pendingRequests.length})
              </h3>
              {pendingRequests.map(user => (
                  <div key={user.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-800 font-bold text-sm">
                              {user.initials}
                          </div>
                          <div>
                              <h3 className="font-semibold text-gray-900 text-sm">{user.name}</h3>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                  <Phone size={10} />
                                  <span>{user.phoneNumber}</span>
                              </div>
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded mt-1 inline-block">Needs Approval</span>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => onApproveUser(user.id)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm" title="Approve">
                              <Check size={18} />
                          </button>
                          <button onClick={() => onRejectUser(user.id)} className="p-2 bg-red-50 text-red-500 rounded-lg border border-red-100 hover:bg-red-100" title="Reject">
                              <X size={18} />
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Pending Invites Section */}
      {invitedUsers.length > 0 && (
          <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-1 flex items-center gap-2">
                  <Clock size={16} /> Pending Invites ({invitedUsers.length})
              </h3>
              {invitedUsers.map(user => (
                  <div key={user.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 border-dashed flex items-center justify-between">
                      <div className="flex items-center gap-3 opacity-75">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm">
                              {user.initials}
                          </div>
                          <div>
                              <h3 className="font-semibold text-gray-900 text-sm">{user.name}</h3>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                  <Phone size={10} />
                                  <span>{user.phoneNumber}</span>
                              </div>
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded mt-1 inline-block">Invited</span>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => onRemindInvite(user.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Send Reminder">
                              <Bell size={18} />
                          </button>
                          <button onClick={() => onRevokeInvite(user.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Revoke Invite">
                              <Trash2 size={18} />
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Active Team Section */}
      <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-1">Active Members ({activeUsers.length})</h3>
          {activeUsers.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                      {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                      ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${user.role === UserRole.MANAGER || user.role === UserRole.OWNER ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                              {user.initials}
                          </div>
                      )}
                      <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{user.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-0.5">
                              {user.department && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                    <Briefcase size={8} /> {user.department}
                                </span>
                              )}
                              <span className={`text-[10px] uppercase tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ${user.role === UserRole.OWNER ? 'text-amber-600 bg-amber-50 font-bold' : ''}`}>
                                  {user.role}
                              </span>
                          </div>
                      </div>
                  </div>
                  {user.role !== UserRole.OWNER && (
                      <div className="flex items-center gap-1">
                         <a 
                             href={`tel:${user.phoneNumber}`}
                             className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                             title="Call User"
                         >
                            <Phone size={18} />
                         </a>
                         <button 
                            onClick={() => handleEditClick(user)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Edit User"
                         >
                             <Edit2 size={18} />
                         </button>
                      </div>
                  )}
              </div>
          ))}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        {showDeleteConfirm ? 'Remove Member' : 'Edit Member'}
                    </h2>
                    <button onClick={() => setEditingUser(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                {!showDeleteConfirm ? (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input 
                                type="tel" 
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <input 
                                type="text" 
                                value={editDepartment}
                                onChange={(e) => setEditDepartment(e.target.value)}
                                placeholder="e.g. Sales, Kitchen"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                             <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditRole(UserRole.EMPLOYEE)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${editRole === UserRole.EMPLOYEE ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-500'}`}
                                >
                                    Employee
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditRole(UserRole.MANAGER)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${editRole === UserRole.MANAGER ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
                                >
                                    Manager
                                </button>
                             </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                             <button 
                                type="button" 
                                onClick={handleDeleteClick}
                                className="flex-1 bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                             >
                                <Trash2 size={18} />
                                Remove
                             </button>
                             <button 
                                type="submit" 
                                className="flex-[2] bg-primary text-white py-3 rounded-xl text-sm font-semibold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                             >
                                <Save size={18} />
                                Save Changes
                             </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                            <AlertTriangle size={24} className="text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-red-900 text-sm">Are you sure?</h3>
                                <p className="text-xs text-red-700 mt-1">
                                    You are about to remove <strong>{editingUser.name}</strong> from the team.
                                </p>
                            </div>
                        </div>

                        {userTaskCount > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-700 font-medium">
                                    This user has <strong>{userTaskCount} assigned {userTaskCount === 1 ? 'task' : 'tasks'}</strong>.
                                </p>
                                <button 
                                    onClick={() => handleConfirmDelete(true)}
                                    className="w-full bg-red-600 text-white py-3 rounded-xl text-sm font-semibold shadow-sm hover:bg-red-700"
                                >
                                    Remove User & Delete Tasks
                                </button>
                                <button 
                                    onClick={() => handleConfirmDelete(false)}
                                    className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50"
                                >
                                    Remove User & Keep Tasks
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleConfirmDelete(false)}
                                    className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-semibold shadow-sm hover:bg-red-700"
                                >
                                    Confirm
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default TeamList;
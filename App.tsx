import React, { useState, useEffect } from 'react';
import { AppState, User, Task, UserRole, UserStatus, TaskStatus, TaskPriority, Comment, TaskDraft, Notification } from './types';
import { MOCK_USERS, MOCK_TASKS, MOCK_NOTIFICATIONS } from './constants';
import LoginScreen from './components/LoginScreen';
import Layout from './components/Layout';
import TaskCard from './components/TaskCard';
import TeamList from './components/TeamList';
import AddTaskModal from './components/AddTaskModal';
import Dashboard from './components/Dashboard';
import SettingsScreen from './components/SettingsScreen';
import VoiceTaskCreator from './components/VoiceTaskCreator';
import AIChatTab from './components/AIChatTab';
import NotificationsView from './components/NotificationsView';
import { Filter, ArrowUp, ArrowDown } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: MOCK_USERS,
    tasks: MOCK_TASKS,
    notifications: MOCK_NOTIFICATIONS,
  });

  const [currentTab, setCurrentTab] = useState('tasks');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');

  // Company Settings State
  const [companyCode, setCompanyCode] = useState('TEAM2025');
  const [isInviteEnabled, setIsInviteEnabled] = useState(true);

  // Helper to persist state (optional, simplified for demo)
  useEffect(() => {
    const savedUser = localStorage.getItem('teamSync_user');
    if (savedUser) {
        const userId = JSON.parse(savedUser);
        const user = state.users.find(u => u.id === userId && u.status === UserStatus.ACTIVE);
        if (user) {
            setState(prev => ({ ...prev, currentUser: user }));
        }
    }
  }, []);

  const handleLogin = (user: User) => {
    if (user.status === UserStatus.INVITED) {
        // First time login for invited user -> Activate
        const activatedUser = { ...user, status: UserStatus.ACTIVE };
        setState(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === user.id ? activatedUser : u),
            currentUser: activatedUser
        }));
        localStorage.setItem('teamSync_user', JSON.stringify(activatedUser.id));
    } else {
        localStorage.setItem('teamSync_user', JSON.stringify(user.id));
        setState(prev => ({ ...prev, currentUser: user }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teamSync_user');
    setState(prev => ({ ...prev, currentUser: null }));
    setCurrentTab('tasks');
  };

  const handleJoinTeam = (name: string, phone: string) => {
    const newUser: User = {
        id: `u${Date.now()}`,
        name,
        role: UserRole.EMPLOYEE,
        status: UserStatus.PENDING_APPROVAL,
        initials: name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase(),
        phoneNumber: phone
    };
    
    // Add user but do not log in (waiting approval)
    setState(prev => ({
        ...prev,
        users: [...prev.users, newUser],
    }));
  };

  const handleSaveTask = (taskData: any) => {
      if (editingTaskId) {
          // Update existing task
          setState(prev => ({
              ...prev,
              tasks: prev.tasks.map(t => t.id === editingTaskId ? { ...t, ...taskData, id: editingTaskId } : t)
          }));
      } else {
          // Add new task
          const task: Task = {
              ...taskData,
              id: `t${Date.now()}`,
          };
          setState(prev => ({ ...prev, tasks: [task, ...prev.tasks] }));
      }
      setTaskDraft(null);
      setEditingTaskId(null);
  };

  const handleStatusChange = (taskId: string, status: TaskStatus, photoProof?: string, completionLocation?: {lat: number, lng: number}) => {
      setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => 
              t.id === taskId ? { 
                  ...t, 
                  status, 
                  photoProof: photoProof || t.photoProof,
                  completionLocation: completionLocation || t.completionLocation
              } : t
          )
      }));
  };

  const handleAddComment = (taskId: string, text: string, image?: string) => {
      if (!state.currentUser) return;
      const newComment: Comment = {
          id: `c${Date.now()}`,
          userId: state.currentUser.id,
          text,
          timestamp: Date.now(),
          image
      };
      
      setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => {
              if (t.id !== taskId) return t;
              
              // Automatically move to IN_PROGRESS if currently TODO
              const newStatus = t.status === TaskStatus.TODO ? TaskStatus.IN_PROGRESS : t.status;
              
              return { 
                  ...t, 
                  comments: [...t.comments, newComment],
                  status: newStatus
              };
          })
      }));
  };

  const handleChecklistToggle = (taskId: string, itemId: string) => {
      setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => {
              if (t.id !== taskId) return t;

              const updatedChecklist = t.checklist.map(item => 
                  item.id === itemId ? { ...item, completed: !item.completed } : item
              );

              // Automatically move to IN_PROGRESS if currently TODO
              const newStatus = t.status === TaskStatus.TODO ? TaskStatus.IN_PROGRESS : t.status;

              return { ...t, checklist: updatedChecklist, status: newStatus };
          })
      }));
  };

  const handleAddUser = (name: string, role: UserRole, phoneNumber: string, department?: string) => {
      const newUser: User = {
          id: `u${Date.now()}`,
          name,
          role,
          status: UserStatus.INVITED,
          initials: name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase(),
          phoneNumber,
          department
      };
      setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
      setIsAddMemberOpen(false); // Close form after adding
  };

  const handleUpdateUser = (updatedUser: User) => {
      setState(prev => {
        const nextUsers = prev.users.map(u => u.id === updatedUser.id ? updatedUser : u);
        
        // If updating the current user (e.g. photo), update that state too
        const nextCurrentUser = prev.currentUser && prev.currentUser.id === updatedUser.id 
            ? updatedUser 
            : prev.currentUser;

        return {
          ...prev,
          users: nextUsers,
          currentUser: nextCurrentUser
        };
      });
  };

  const handleDeleteUser = (userId: string, deleteTasks: boolean) => {
      setState(prev => {
          let updatedTasks = prev.tasks;
          if (deleteTasks) {
              updatedTasks = prev.tasks.filter(t => t.assignedTo !== userId);
          }
          return {
              ...prev,
              users: prev.users.filter(u => u.id !== userId),
              tasks: updatedTasks
          };
      });
  };

  // Team Management Handlers
  const handleApproveUser = (userId: string) => {
      setState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === userId ? { ...u, status: UserStatus.ACTIVE } : u)
      }));
  };

  const handleRejectUser = (userId: string) => {
      handleDeleteUser(userId, false);
  };

  const handleRevokeInvite = (userId: string) => {
      handleDeleteUser(userId, false);
  };

  const handleRemindInvite = (userId: string) => {
      alert("SMS reminder sent to user!");
  };


  // New Feature: Clone Task
  const handleCloneTask = (originalTask: Task) => {
    const [datePart, timePart] = originalTask.dueDate.split('T');

    const draft: TaskDraft = {
        title: `${originalTask.title} (Copy)`,
        description: originalTask.description,
        priority: originalTask.priority,
        dueDate: datePart,
        dueTime: timePart || '09:00',
        assignedTo: originalTask.assignedTo,
        recurrence: originalTask.recurrence,
        recurrenceDays: originalTask.recurrenceDays,
        recurrenceEndDate: originalTask.recurrenceEndDate,
        checklist: originalTask.checklist.map(c => c.text),
        requireLocation: originalTask.requireLocation,
        requirePhotoProof: originalTask.requirePhotoProof
    };

    setEditingTaskId(null);
    setTaskDraft(draft);
    setIsTaskModalOpen(true);
  };

  // New Feature: Edit Task
  const handleEditTask = (originalTask: Task) => {
    const [datePart, timePart] = originalTask.dueDate.split('T');

    const draft: TaskDraft = {
        title: originalTask.title,
        description: originalTask.description,
        priority: originalTask.priority,
        dueDate: datePart,
        dueTime: timePart || '09:00',
        assignedTo: originalTask.assignedTo,
        recurrence: originalTask.recurrence,
        recurrenceDays: originalTask.recurrenceDays,
        recurrenceEndDate: originalTask.recurrenceEndDate,
        checklist: originalTask.checklist.map(c => c.text),
        requireLocation: originalTask.requireLocation,
        requirePhotoProof: originalTask.requirePhotoProof
    };

    setEditingTaskId(originalTask.id);
    setTaskDraft(draft);
    setIsTaskModalOpen(true);
  };

  // New Feature: Send Reminder
  const handleSendReminder = (taskId: string) => {
    alert(`Push notification reminder sent to assignee for task ID: ${taskId}`);
  };

  // Voice Task Creation Handlers
  const handleVoiceDraft = (draft: TaskDraft) => {
      setIsVoiceModeOpen(false);
      setEditingTaskId(null);
      setTaskDraft(draft);
      setIsTaskModalOpen(true);
  };

  // Notification Handlers
  const handleMarkNotificationRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  };

  const handleMarkAllNotificationsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }));
  };

  // Invite Code Management
  const handleRegenerateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCompanyCode(result);
  };

  const handleToggleInvite = () => {
    setIsInviteEnabled(!isInviteEnabled);
  };

  if (!state.currentUser) {
    return (
        <LoginScreen 
            users={state.users} 
            onLogin={handleLogin} 
            onJoinTeam={handleJoinTeam}
            companyCode={isInviteEnabled ? companyCode : ''}
        />
    );
  }

  // Explicitly check for both roles
  const isManagement = state.currentUser.role === UserRole.MANAGER || state.currentUser.role === UserRole.OWNER;
  
  // Determine Page Title
  let pageTitle = 'TeamSync';
  if (currentTab === 'tasks') pageTitle = isManagement ? 'All Tasks' : 'My Tasks';
  else if (currentTab === 'chat') pageTitle = 'AI Assistant';
  else if (currentTab === 'notifications') pageTitle = 'Notifications';
  else if (currentTab === 'team') pageTitle = 'Team Members';
  else if (currentTab === 'dashboard') pageTitle = 'Team Stats';
  else if (currentTab === 'settings') pageTitle = 'Settings';

  // Filter tasks based on role: Managers see all, Employees see assigned to them OR created by them
  const visibleTasks = isManagement 
    ? state.tasks 
    : state.tasks.filter(t => t.assignedTo === state.currentUser?.id || t.createdBy === state.currentUser?.id);

  // Apply Status Filter
  const filteredTasks = visibleTasks.filter(task => {
      if (statusFilter === 'ALL') return true;
      return task.status === statusFilter;
  });

  // Sorting Logic
  const getPriorityValue = (p: TaskPriority) => {
      switch (p) {
          case TaskPriority.URGENT: return 4;
          case TaskPriority.HIGH: return 3;
          case TaskPriority.MEDIUM: return 2;
          case TaskPriority.LOW: return 1;
          default: return 0;
      }
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
      // 1. Always keep completed/verified tasks at the bottom
      const aCompleted = a.status === TaskStatus.COMPLETED || a.status === TaskStatus.VERIFIED;
      const bCompleted = b.status === TaskStatus.COMPLETED || b.status === TaskStatus.VERIFIED;
      
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;

      // 2. Sort by selected criteria
      let comparison = 0;
      if (sortBy === 'priority') {
          comparison = getPriorityValue(a.priority) - getPriorityValue(b.priority);
      } else {
          // Sort by Due Date
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }

      // 3. Apply Order
      return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <>
      <Layout 
        currentUser={state.currentUser} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab}
        onLogout={handleLogout}
        onSettings={() => setCurrentTab('settings')}
        onQuickAdd={() => { setTaskDraft(null); setEditingTaskId(null); setIsTaskModalOpen(true); }}
        onAddMember={() => setIsAddMemberOpen(true)}
        onVoiceCreate={() => setIsVoiceModeOpen(true)}
        notifications={state.notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        pageTitle={pageTitle}
      >
        <div className="max-w-md mx-auto">
            {currentTab === 'tasks' && (
                <div className="space-y-4">
                    {/* Filter Chips - Horizontal Scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
                        {(['ALL', TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.VERIFIED] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                    statusFilter === status
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Sorting Controls */}
                    <div className="flex items-center justify-between mb-2">
                         <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setSortBy('priority')}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                    sortBy === 'priority' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Priority
                            </button>
                            <button
                                onClick={() => setSortBy('dueDate')}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                    sortBy === 'dueDate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Due Date
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200"
                            >
                                {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                            </button>
                             <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                                {sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                        </div>
                    </div>

                    {sortedTasks.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <Filter size={24} className="text-gray-300" />
                            </div>
                            <p>No tasks found.</p>
                        </div>
                    ) : (
                        sortedTasks.map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                assignee={state.users.find(u => u.id === task.assignedTo)}
                                isManagement={isManagement}
                                users={state.users}
                                currentUser={state.currentUser!}
                                onStatusChange={handleStatusChange}
                                onAddComment={handleAddComment}
                                onToggleChecklist={handleChecklistToggle}
                                onClone={handleCloneTask}
                                onRemind={handleSendReminder}
                                onEdit={handleEditTask}
                            />
                        ))
                    )}
                </div>
            )}

            {currentTab === 'chat' && (
                <AIChatTab 
                    currentUser={state.currentUser}
                    onDraftCreated={handleVoiceDraft}
                    onVoiceCreate={() => setIsVoiceModeOpen(true)}
                />
            )}

            {currentTab === 'notifications' && (
                <NotificationsView 
                    notifications={state.notifications}
                    onMarkRead={handleMarkNotificationRead}
                    onMarkAllRead={handleMarkAllNotificationsRead}
                />
            )}

            {currentTab === 'team' && isManagement && (
                <TeamList 
                    users={state.users}
                    tasks={state.tasks}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    isAdding={isAddMemberOpen}
                    onCancelAdd={() => setIsAddMemberOpen(false)}
                    companyCode={companyCode}
                    isInviteEnabled={isInviteEnabled}
                    onRegenerateCode={handleRegenerateCode}
                    onToggleInvite={handleToggleInvite}
                    onApproveUser={handleApproveUser}
                    onRejectUser={handleRejectUser}
                    onRemindInvite={handleRemindInvite}
                    onRevokeInvite={handleRevokeInvite}
                />
            )}

            {currentTab === 'dashboard' && isManagement && (
                <Dashboard tasks={state.tasks} />
            )}

            {currentTab === 'settings' && (
                <SettingsScreen 
                    currentUser={state.currentUser} 
                    onLogout={handleLogout} 
                    onUpdateUser={handleUpdateUser}
                />
            )}
        </div>
      </Layout>

      {/* Voice Mode Overlay */}
      {isVoiceModeOpen && (
          <VoiceTaskCreator 
             onClose={() => setIsVoiceModeOpen(false)} 
             onDraftCreated={handleVoiceDraft}
          />
      )}

      <AddTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onAdd={handleSaveTask}
        users={state.users}
        currentUser={state.currentUser}
        initialData={taskDraft}
        isEditing={!!editingTaskId}
      />
    </>
  );
};

export default App;
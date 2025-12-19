import React, { useState, useEffect } from 'react';
import { AppState, User, Task, UserRole, UserStatus, TaskStatus, TaskPriority, Comment, TaskDraft, Notification } from './types';
import * as api from './services/api';
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
import { Filter, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: [],
    tasks: [],
    notifications: [],
  });

  const [isLoading, setIsLoading] = useState(true);
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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedUserId = localStorage.getItem('teamSync_user');
        const [users, settings] = await Promise.all([
          api.getUsers(),
          api.getSettings()
        ]);
        
        setState(prev => ({ ...prev, users }));
        setCompanyCode(settings.companyCode || 'TEAM2025');
        setIsInviteEnabled(settings.isInviteEnabled ?? true);

        if (savedUserId) {
          const userId = JSON.parse(savedUserId);
          const user = users.find(u => u.id === userId && u.status === UserStatus.ACTIVE);
          if (user) {
            setState(prev => ({ ...prev, currentUser: user }));
            await loadUserData(user);
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const loadUserData = async (user: User) => {
    try {
      const isManagement = user.role === UserRole.MANAGER || user.role === UserRole.OWNER;
      const [tasks, notifications] = await Promise.all([
        api.getTasks(user.id, user.role),
        api.getNotifications(user.id)
      ]);
      
      setState(prev => ({
        ...prev,
        tasks,
        notifications,
        currentUser: user
      }));
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const refreshData = async () => {
    if (!state.currentUser) return;
    try {
      const [users, tasks, notifications] = await Promise.all([
        api.getUsers(),
        api.getTasks(state.currentUser.id, state.currentUser.role),
        api.getNotifications(state.currentUser.id)
      ]);
      setState(prev => ({ ...prev, users, tasks, notifications }));
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleLogin = async (user: User) => {
    if (user.status === UserStatus.INVITED) {
      // First time login for invited user -> Activate
      try {
        const activatedUser = await api.updateUser(user.id, { status: UserStatus.ACTIVE });
        localStorage.setItem('teamSync_user', JSON.stringify(activatedUser.id));
        setState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === user.id ? activatedUser : u),
          currentUser: activatedUser
        }));
        await loadUserData(activatedUser);
      } catch (error) {
        console.error('Failed to activate user:', error);
      }
    } else {
      localStorage.setItem('teamSync_user', JSON.stringify(user.id));
      setState(prev => ({ ...prev, currentUser: user }));
      await loadUserData(user);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teamSync_user');
    setState(prev => ({ ...prev, currentUser: null, tasks: [], notifications: [] }));
    setCurrentTab('tasks');
  };

  const handleJoinTeam = async (name: string, phone: string, code: string) => {
    try {
      const result = await api.joinTeam(name, phone, code);
      const users = await api.getUsers();
      setState(prev => ({ ...prev, users }));
      return result.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to join team');
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (editingTaskId) {
        // Update existing task
        await api.updateTask(editingTaskId, taskData);
      } else {
        // Add new task
        await api.createTask({
          ...taskData,
          createdBy: state.currentUser?.id
        });
      }
      await refreshData();
      setTaskDraft(null);
      setEditingTaskId(null);
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus, photoProof?: string, completionLocation?: {lat: number, lng: number}) => {
    try {
      await api.updateTaskStatus(taskId, status, photoProof, completionLocation);
      await refreshData();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleAddComment = async (taskId: string, text: string, image?: string) => {
    if (!state.currentUser) return;
    try {
      await api.addComment(taskId, state.currentUser.id, text, image);
      await refreshData();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleChecklistToggle = async (taskId: string, itemId: string) => {
    try {
      await api.toggleChecklistItem(taskId, itemId);
      await refreshData();
    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
    }
  };

  const handleAddUser = async (name: string, role: UserRole, phoneNumber: string, department?: string) => {
    try {
      await api.createUser({ name, role, phoneNumber, department });
      const users = await api.getUsers();
      setState(prev => ({ ...prev, users }));
      setIsAddMemberOpen(false);
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const user = await api.updateUser(updatedUser.id, updatedUser);
      const users = await api.getUsers();
      setState(prev => {
        const nextCurrentUser = prev.currentUser && prev.currentUser.id === updatedUser.id 
            ? user 
            : prev.currentUser;
        return { ...prev, users, currentUser: nextCurrentUser };
      });
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string, deleteTasks: boolean) => {
    try {
      await api.deleteUser(userId, deleteTasks);
      await refreshData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await api.approveUser(userId);
      const users = await api.getUsers();
      setState(prev => ({ ...prev, users }));
    } catch (error) {
      console.error('Failed to approve user:', error);
    }
  };

  const handleRejectUser = async (userId: string) => {
    await handleDeleteUser(userId, false);
  };

  const handleRevokeInvite = async (userId: string) => {
    await handleDeleteUser(userId, false);
  };

  const handleRemindInvite = (userId: string) => {
    alert("SMS reminder sent to user!");
  };

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

  const handleSendReminder = (taskId: string) => {
    alert(`Push notification reminder sent to assignee for task ID: ${taskId}`);
  };

  const handleVoiceDraft = (draft: TaskDraft) => {
    setIsVoiceModeOpen(false);
    setEditingTaskId(null);
    setTaskDraft(draft);
    setIsTaskModalOpen(true);
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      }));
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!state.currentUser) return;
    try {
      await api.markAllNotificationsRead(state.currentUser.id);
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }));
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const result = await api.regenerateCompanyCode();
      setCompanyCode(result.companyCode);
    } catch (error) {
      console.error('Failed to regenerate code:', error);
    }
  };

  const handleToggleInvite = async () => {
    try {
      const newValue = !isInviteEnabled;
      await api.toggleInviteEnabled(newValue);
      setIsInviteEnabled(newValue);
    } catch (error) {
      console.error('Failed to toggle invite:', error);
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Loader2 size={32} className="text-white animate-spin" />
        </div>
        <p className="text-gray-500 font-medium">Loading TaskPulse...</p>
      </div>
    );
  }

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

  const isManagement = state.currentUser.role === UserRole.MANAGER || state.currentUser.role === UserRole.OWNER;
  
  let pageTitle = 'TaskPulse';
  if (currentTab === 'tasks') pageTitle = isManagement ? 'All Tasks' : 'My Tasks';
  else if (currentTab === 'chat') pageTitle = 'AI Assistant';
  else if (currentTab === 'notifications') pageTitle = 'Notifications';
  else if (currentTab === 'team') pageTitle = 'Team Members';
  else if (currentTab === 'dashboard') pageTitle = 'Team Stats';
  else if (currentTab === 'settings') pageTitle = 'Settings';

  const visibleTasks = isManagement 
    ? state.tasks 
    : state.tasks.filter(t => t.assignedTo === state.currentUser?.id || t.createdBy === state.currentUser?.id);

  const filteredTasks = visibleTasks.filter(task => {
      if (statusFilter === 'ALL') return true;
      return task.status === statusFilter;
  });

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
      const aCompleted = a.status === TaskStatus.COMPLETED || a.status === TaskStatus.VERIFIED;
      const bCompleted = b.status === TaskStatus.COMPLETED || b.status === TaskStatus.VERIFIED;
      
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;

      let comparison = 0;
      if (sortBy === 'priority') {
          comparison = getPriorityValue(a.priority) - getPriorityValue(b.priority);
      } else {
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }

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
        <div className="max-w-md mx-auto" data-testid="main-content">
            {currentTab === 'tasks' && (
                <div className="space-y-4" data-testid="tasks-tab">
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
                        {(['ALL', TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.VERIFIED] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                data-testid={`filter-${status.toLowerCase()}`}
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

                    <div className="flex items-center justify-between mb-2">
                         <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setSortBy('priority')}
                                data-testid="sort-priority"
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                    sortBy === 'priority' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Priority
                            </button>
                            <button
                                onClick={() => setSortBy('dueDate')}
                                data-testid="sort-duedate"
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
                                data-testid="sort-order-toggle"
                                className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200"
                            >
                                {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                            </button>
                             <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200" data-testid="task-count">
                                {sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                        </div>
                    </div>

                    {sortedTasks.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 flex flex-col items-center" data-testid="empty-tasks">
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

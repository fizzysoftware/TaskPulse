import axios from 'axios';
import { User, Task, Notification, TaskStatus } from '../types';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============== AUTH ==============

export const sendOTP = async (phoneNumber: string) => {
  const response = await api.post('/api/auth/send-otp', { phoneNumber });
  return response.data;
};

export const verifyOTP = async (phoneNumber: string, otp: string) => {
  const response = await api.post('/api/auth/verify-otp', { phoneNumber, otp });
  return response.data;
};

export const joinTeam = async (name: string, phoneNumber: string, companyCode: string) => {
  const response = await api.post('/api/auth/join-team', { name, phoneNumber, companyCode });
  return response.data;
};

// ============== USERS ==============

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/api/users');
  return response.data;
};

export const getUser = async (userId: string): Promise<User> => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

export const createUser = async (userData: {
  name: string;
  role: string;
  phoneNumber: string;
  department?: string;
}): Promise<User> => {
  const response = await api.post('/api/users', userData);
  return response.data;
};

export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
  const response = await api.put(`/api/users/${userId}`, userData);
  return response.data;
};

export const approveUser = async (userId: string): Promise<User> => {
  const response = await api.put(`/api/users/${userId}/approve`);
  return response.data;
};

export const deleteUser = async (userId: string, deleteTasks: boolean = false) => {
  const response = await api.delete(`/api/users/${userId}?delete_tasks=${deleteTasks}`);
  return response.data;
};

// ============== TASKS ==============

export const getTasks = async (userId?: string, role?: string): Promise<Task[]> => {
  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId);
  if (role) params.append('role', role);
  const response = await api.get(`/api/tasks?${params.toString()}`);
  return response.data;
};

export const getTask = async (taskId: string): Promise<Task> => {
  const response = await api.get(`/api/tasks/${taskId}`);
  return response.data;
};

export const createTask = async (taskData: Partial<Task>): Promise<Task> => {
  const response = await api.post('/api/tasks', taskData);
  return response.data;
};

export const updateTask = async (taskId: string, taskData: Partial<Task>): Promise<Task> => {
  const response = await api.put(`/api/tasks/${taskId}`, taskData);
  return response.data;
};

export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus,
  photoProof?: string,
  completionLocation?: { lat: number; lng: number }
): Promise<Task> => {
  const response = await api.put(`/api/tasks/${taskId}/status`, {
    status,
    photoProof,
    completionLocation,
  });
  return response.data;
};

export const addComment = async (
  taskId: string,
  userId: string,
  text: string,
  image?: string
): Promise<Task> => {
  const response = await api.post(`/api/tasks/${taskId}/comments`, {
    userId,
    text,
    image,
  });
  return response.data;
};

export const toggleChecklistItem = async (
  taskId: string,
  itemId: string
): Promise<Task> => {
  const response = await api.put(`/api/tasks/${taskId}/checklist/${itemId}`);
  return response.data;
};

// ============== NOTIFICATIONS ==============

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const response = await api.get(`/api/notifications?user_id=${userId}`);
  return response.data;
};

export const markNotificationRead = async (notificationId: string) => {
  const response = await api.put(`/api/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async (userId: string) => {
  const response = await api.put(`/api/notifications/read-all?user_id=${userId}`);
  return response.data;
};

// ============== SETTINGS ==============

export const getSettings = async () => {
  const response = await api.get('/api/settings');
  return response.data;
};

export const regenerateCompanyCode = async () => {
  const response = await api.post('/api/settings/regenerate-code');
  return response.data;
};

export const toggleInviteEnabled = async (enabled: boolean) => {
  const response = await api.put(`/api/settings/invite-enabled?enabled=${enabled}`);
  return response.data;
};

export default api;

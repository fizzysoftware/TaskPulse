
export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED', // Added by manager, hasn't logged in yet
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Joined via code, waiting for manager
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
}

export enum Recurrence {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string; // URL or base64
  initials: string;
  phoneNumber: string; // Mandatory
  department?: string; // Optional department/role description
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  image?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  createdBy: string; // userId
  dueDate: string; // ISO Date string (potentially with time)
  priority: TaskPriority;
  status: TaskStatus;
  recurrence: Recurrence;
  recurrenceDays?: number[]; // 0=Sunday, 1=Monday, etc.
  recurrenceEndDate?: string; // ISO Date string
  
  location?: string; // Text description of location
  requireLocation?: boolean; // If true, must fetch GPS on completion
  completionLocation?: { lat: number; lng: number }; // GPS coords when completed
  
  referencePhoto?: string; // base64
  requirePhotoProof?: boolean;
  photoProof?: string; // base64
  
  checklist: { id: string; text: string; completed: boolean }[];
  comments: Comment[];
  createdAt: number;
}

export interface TaskDraft {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    dueTime?: string;
    assignedTo?: string;
    recurrence?: Recurrence;
    recurrenceDays?: number[];
    recurrenceEndDate?: string;
    checklist?: string[]; // Array of texts
    requireLocation?: boolean;
    requirePhotoProof?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'COMMENT' | 'SYSTEM';
  timestamp: number;
  read: boolean;
  taskId?: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  tasks: Task[];
  notifications: Notification[];
}
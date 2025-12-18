import { User, UserRole, UserStatus, Task, TaskPriority, TaskStatus, Recurrence, Notification } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Owner', role: UserRole.OWNER, status: UserStatus.ACTIVE, initials: 'AO', phoneNumber: '5550001', department: 'Management' },
  { id: 'u2', name: 'Bob Barista', role: UserRole.EMPLOYEE, status: UserStatus.ACTIVE, initials: 'BB', phoneNumber: '5550002', department: 'Front of House' },
  { id: 'u3', name: 'Charlie Chef', role: UserRole.EMPLOYEE, status: UserStatus.ACTIVE, initials: 'CC', phoneNumber: '5550003', department: 'Kitchen' },
  { id: 'u4', name: 'Dana Driver', role: UserRole.EMPLOYEE, status: UserStatus.ACTIVE, initials: 'DD', phoneNumber: '5550004', department: 'Logistics' },
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Open the store',
    description: 'Unlock front doors, turn on lights, start coffee machine.',
    assignedTo: 'u2',
    createdBy: 'u1',
    dueDate: new Date().toISOString().split('T')[0],
    priority: TaskPriority.HIGH,
    status: TaskStatus.TODO,
    recurrence: Recurrence.DAILY,
    checklist: [
        { id: 'c1', text: 'Unlock doors', completed: false },
        { id: 'c2', text: 'Lights on', completed: false },
        { id: 'c3', text: 'Music on', completed: false }
    ],
    comments: [],
    createdAt: Date.now(),
  },
  {
    id: 't2',
    title: 'Inventory Check',
    description: 'Count the stock in the back room and update the sheet.',
    assignedTo: 'u3',
    createdBy: 'u1',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.IN_PROGRESS,
    recurrence: Recurrence.WEEKLY,
    checklist: [],
    comments: [],
    createdAt: Date.now() - 100000,
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'New Task Assigned',
    message: 'Alice assigned you "Open the store"',
    type: 'TASK_ASSIGNED',
    timestamp: Date.now() - 3600000,
    read: false,
    taskId: 't1'
  },
  {
    id: 'n2',
    title: 'Task Completed',
    message: 'Bob completed "Morning Prep"',
    type: 'TASK_COMPLETED',
    timestamp: Date.now() - 7200000,
    read: true
  },
  {
    id: 'n3',
    title: 'New Comment',
    message: 'Charlie commented on your task',
    type: 'COMMENT',
    timestamp: Date.now() - 86400000,
    read: false,
    taskId: 't2'
  }
];

export const PLACEHOLDER_IMAGE = "https://picsum.photos/400/300";
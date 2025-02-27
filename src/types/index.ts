import { User as FirebaseUser } from 'firebase/auth'

export interface User {
  User: FirebaseUser
}

export interface Task {
  id?: string
  startTime: number
  duration: number
  activity: string
  description: string
  isPriority: boolean
  completed: boolean
  date: string
  userId: string
  createdAt: number
  reminderSent?: boolean
  category?: string
  lastUpdated?: number
  day?: string
}

export interface HistoricalTask extends Task {
  originalDate: string
  actualDate: string
  archivedAt: number
  completionTime?: number
  dueDate?: string
  completedDate?: string
  recurring?: boolean
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
export interface UserPreferences {
  userId: string;
  phoneNumber: string | null;
  smsReminders: boolean;
  emailReminders: boolean;
  pushReminders: boolean;
  pushSubscription: PushSubscriptionJSON | null;
  reminderTime: number;
  email: string;
  defaultView: 'today' | 'schedule';
  hasCompletedTour?: boolean;
  timezone: string;
}

export interface SuggestedTask extends Omit<Task, 'id'> {
  confidence: number
  category: string
}

export interface TaskDetailPopupProps {
  task: Task
  onClose: () => void
  theme: string
  isEditMode: boolean
  onModify: () => void
  onPriorityToggle: () => void
  onDelete: () => void
}

export interface SuggestedTaskCardProps {
  suggestion: SuggestedTask
  theme: string
  onAccept: (task: Partial<Task>) => void
  existingTasks: Task[]
  onRemove: () => void
  user: User | null
  setTomorrowTasks: (tasks: Task[] | ((prevTasks: Task[]) => Task[])) => void
  setPlannedHours: (hours: number | ((prev: number) => number)) => void
}

export interface NotificationHistory {
  taskId: string;
  type: 'email' | 'sms';
  status: 'success' | 'failed';
  timestamp: number;
  error?: string;
}

export interface TaskSuggestion {
  activity: string
  startTime: number
  duration: number
  description?: string
  confidence: number
  userId: string
  day: string
  createdAt: number
  processed: boolean
}

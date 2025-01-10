import { User } from 'firebase/auth'

export interface Task {
  id?: string
  startTime: number
  duration: number
  activity: string
  description?: string
  isPriority: boolean
  completed: boolean
  date: string
  userId?: string
  category?: string
  reminderSent?: boolean
  createdAt: number
}

export interface HistoricalTask extends Task {
  originalDate: string
  actualDate: string
  archivedAt: number
  completionTime?: number
  dueDate?: string
  completedDate?: string
}

export interface UserPreferences {
  userId: string
  emailReminders: boolean
  reminderTime: number
  email: string
}

export interface SuggestedTask {
  activity: string
  startTime: number
  duration: number
  description?: string
  category?: string
  confidence?: number
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
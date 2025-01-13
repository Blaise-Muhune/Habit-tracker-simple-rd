import { Task, SuggestedTask } from '../types'
import { User } from 'firebase/auth'

interface SuggestedTaskCardProps {
  suggestion: SuggestedTask
  theme: string
  existingTasks: Task[]
  onAccept: (task: Partial<Task>) => void
  onRemove: () => void
  user: User | null
  setTomorrowTasks: (tasks: Task[]) => void
}

export default function SuggestedTaskCard({
  suggestion,
  theme,
  existingTasks,
  onAccept,
  onRemove,
  user,
  setTomorrowTasks
}: SuggestedTaskCardProps) {
  const formatTime = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:00 ${ampm}`;
  };

  const handleAccept = () => {
    const newTask: Partial<Task> = {
      activity: suggestion.activity,
      startTime: suggestion.startTime,
      duration: suggestion.duration,
      title: suggestion.activity,
      completed: false,
      isPriority: false,
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      userId: user?.uid,
      ...(suggestion.description && { description: suggestion.description }),
      ...(suggestion.category && { category: suggestion.category }),
    }
    onAccept(newTask)
    onRemove()
  }

  return (
    <div className={`
      p-2.5 rounded-lg border transition-all
      ${theme === 'dark' 
        ? 'bg-slate-800/60 border-slate-700/50'
        : 'bg-white/80 border-slate-200/50'}
    `}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`
            px-2 py-1 rounded-md text-sm whitespace-nowrap
            ${theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'}
          `}>
            {formatTime(suggestion.startTime)}
          </span>
          <h3 className={`font-medium truncate text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {suggestion.activity}
          </h3>
        </div>
        
        <div className="flex gap-1 shrink-0">
          <button
            onClick={handleAccept}
            className={`
              p-1.5 rounded-lg transition-colors
              ${theme === 'dark'
                ? 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400'
                : 'bg-violet-50 hover:bg-violet-100 text-violet-600'}
            `}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className={`
              p-1.5 rounded-lg transition-colors
              ${theme === 'dark'
                ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}
            `}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
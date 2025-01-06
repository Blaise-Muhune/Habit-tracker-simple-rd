'use client'

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'

type Task = {
  id?: string
  startTime: number
  duration: number
  activity: string
  isPriority: boolean
  description?: string
  createdAt: number
  userId?: string
  date: string
  completed?: boolean
}

type TimeBlock = {
  start: number
  end: number
}

type HistoricalTask = Task & {
  originalDate: string  // The date it was originally planned for
  actualDate: string   // The date it was actually executed
}

const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')
const today = formatDate(new Date())
const tomorrow = formatDate(addDays(new Date(), 1))

const formatTime = (hour: number) => {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour.toString().padStart(2, '0')}:00 ${period}`
}

const sampleData = {
  today: [
    {
      startTime: 6,
      duration: 1,
      activity: "Morning Exercise",
      isPriority: true,
      description: "Start the day with energy",
      createdAt: Date.now(),
      date: today,
    },
    {
      startTime: 8,
      duration: 2,
      activity: "Deep Work: Project Planning",
      isPriority: true,
      description: "Focus on most important tasks first",
      createdAt: Date.now(),
      date: today,
    },
    {
      startTime: 12,
      duration: 1,
      activity: "Mindful Lunch Break",
      isPriority: false,
      description: "No screens, just eating and short walk",
      createdAt: Date.now(),
      date: today,
    },
    {
      startTime: 16,
      duration: 1,
      activity: "Learning: New Tech Stack",
      isPriority: true,
      description: "Building foundations for growth",
      createdAt: Date.now(),
      date: today,
    }
  ],
  tomorrow: [
    {
      startTime: 7,
      duration: 1,
      activity: "Meditation & Planning",
      isPriority: true,
      description: "Set intentions for the day",
      createdAt: Date.now(),
      date: tomorrow,
    },
    {
      startTime: 9,
      duration: 2,
      activity: "Code Review & Team Sync",
      isPriority: true,
      description: "Help team move forward",
      createdAt: Date.now(),
      date: tomorrow,
    },
    {
      startTime: 15,
      duration: 2,
      activity: "Feature Development",
      isPriority: true,
      description: "Focus on core functionality",
      createdAt: Date.now(),
      date: tomorrow,
    }
  ]
}

const TaskDetailPopup = ({ 
  task, 
  onClose, 
  theme, 
  isEditMode,
  onModify,
  onPriorityToggle,
  onDelete
}: {
  task: Task
  onClose: () => void
  theme: string
  isEditMode: boolean
  onModify: () => void
  onPriorityToggle: () => void
  onDelete: () => void
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-lg rounded-2xl overflow-hidden
          ${theme === 'dark' 
            ? 'bg-slate-900 border border-slate-800' 
            : 'bg-white border border-slate-200'
          }
        `}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b
          ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-sm
                ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}
              `}>
                {formatTime(task.startTime)} - {formatTime(task.startTime + task.duration)}
              </div>
              {task.isPriority && (
                <span className={`flex items-center gap-1 text-sm
                  ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}
                `}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                  </svg>
                  Priority
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-slate-800/50 transition-colors
                ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
              `}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Activity Title */}
          <div className="space-y-2">
            <h3 className={`text-xl font-semibold
              ${task.completed ? 'line-through opacity-50' : ''}
              ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
            `}>
              {task.activity}
            </h3>
            {task.description && (
              <p className={`text-base
                ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
                ${task.completed ? 'line-through opacity-50' : ''}
              `}>
                {task.description}
              </p>
            )}
          </div>

          {/* Additional Details Section */}
          <div className={`rounded-xl p-6 space-y-4
            ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}
          `}>
            <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Additional Details
            </h4>
            
            {/* Placeholder for future data */}
            <div className="space-y-3">
              <div className={`h-4 rounded w-2/3
                ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}
                animate-pulse
              `} />
              <div className={`h-4 rounded w-1/2
                ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}
                animate-pulse
              `} />
              <div className={`h-4 rounded w-3/4
                ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}
                animate-pulse
              `} />
            </div>
          </div>
        </div>

        {/* Footer - Updated with all action buttons */}
        <div className={`px-6 py-4 border-t
          ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}
        `}>
          <div className="flex justify-between items-center">
            {/* Left side - Priority and Delete buttons */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPriorityToggle()
                }}
                className={`
                  p-2 rounded-lg transition-colors flex items-center gap-2
                  ${task.isPriority
                    ? theme === 'dark'
                      ? 'bg-blue-500/30 text-blue-400'
                      : 'bg-blue-100 text-blue-600'
                    : theme === 'dark'
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
                  }
                `}
              >
                <svg className="w-5 h-5" fill={task.isPriority ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                <span className="hidden sm:inline">Priority</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className={`
                  p-2 rounded-lg transition-colors flex items-center gap-2
                  ${theme === 'dark'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                  />
                </svg>
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>

            {/* Right side - Modify and Close buttons */}
            <div className="flex gap-3">
              {isEditMode && (
                <button
                  onClick={() => {
                    onClose()
                    onModify()
                  }}
                  className={`px-4 py-2 rounded-lg font-medium
                    ${theme === 'dark'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                  `}
                >
                  Modify Task
                </button>
              )}
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg font-medium
                  ${theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200'
                  }
                `}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function DailyTaskManager() {
  const { theme, setTheme } = useTheme()
  const { user, signInWithGoogle, logout } = useAuth()
  const [showTomorrow, setShowTomorrow] = useState(false)
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([])
  const [isCombineMode, setIsCombineMode] = useState(false)
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [currentHour, setCurrentHour] = useState(new Date().getHours())
  const [isLoading, setIsLoading] = useState(true)
  const [completedPriorities, setCompletedPriorities] = useState<number>(0)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [showDetailPopup, setShowDetailPopup] = useState(false)

  const getCurrentTasks = () => showTomorrow ? tomorrowTasks : todayTasks
  const setCurrentTasks = (tasks: Task[]) => {
    if (showTomorrow) {
      setTomorrowTasks(tasks)
    } else {
      setTodayTasks(tasks)
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!showTomorrow) {
      const currentHourElement = document.getElementById(`hour-${currentHour}`)
      if (currentHourElement) {
        currentHourElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [showTomorrow, currentHour])

  useEffect(() => {
    if (!user) return

    // Check for midnight transition every minute
    const timer = setInterval(async () => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        await handleMidnightTransition()
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [user])

  const handleMidnightTransition = async () => {
    if (!user) return

    try {
      // 1. Get yesterday's date
      const yesterday = formatDate(addDays(new Date(), -1))
      
      // 2. Query yesterday's tasks to store in history
      const yesterdayQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('date', '==', yesterday)
      )
      const yesterdaySnapshot = await getDocs(yesterdayQuery)
      
      // 3. Store yesterday's tasks in history collection
      const batch = writeBatch(db)
      yesterdaySnapshot.docs.forEach(docSnapshot => {
        const taskData = docSnapshot.data() as Task
        const historyRef = doc(db, 'taskHistory')  // Create new doc reference
        batch.set(historyRef, {
          ...taskData,
          originalDate: yesterday,
          actualDate: yesterday,
          archivedAt: serverTimestamp()
        } as HistoricalTask)
        
        // Delete the task from main collection
        batch.delete(docSnapshot.ref)
      })

      // 4. Move tomorrow's tasks to today
      const oldTomorrowQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('date', '==', yesterday) // This was "tomorrow" yesterday
      )
      const tomorrowSnapshot = await getDocs(oldTomorrowQuery)
      
      tomorrowSnapshot.docs.forEach(docSnapshot => {
        const taskData = docSnapshot.data() as Task
        const newTodayRef = collection(db, 'tasks')
        batch.set(doc(newTodayRef), {
          ...taskData,
          date: formatDate(new Date()), // Set to today
          completed: false // Reset completion status
        })
        
        // Delete the old tomorrow task
        batch.delete(docSnapshot.ref)
      })

      // 5. Execute all operations
      await batch.commit()

      // 6. Refresh the UI
      loadTasks()
    } catch (error) {
      console.error('Error during midnight transition:', error)
    }
  }

  const loadTasks = async () => {
    if (!user) {
      setTodayTasks([])
      setTomorrowTasks([])
      setIsLoading(false)
      return
    }

    try {
      const todayQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('date', '==', today),
        orderBy('startTime', 'asc')
      )
      
      const tomorrowQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('date', '==', tomorrow),
        orderBy('startTime', 'asc')
      )

      const [todaySnapshot, tomorrowSnapshot] = await Promise.all([
        getDocs(todayQuery),
        getDocs(tomorrowQuery)
      ])

      const loadedTodayTasks = todaySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Task[]

      const loadedTomorrowTasks = tomorrowSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Task[]

      setTodayTasks(loadedTodayTasks)
      setTomorrowTasks(loadedTomorrowTasks)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [user])

  useEffect(() => {
    const completed = getCurrentTasks().filter(task => task.isPriority && task.completed).length
    setCompletedPriorities(completed)
  }, [todayTasks, tomorrowTasks, showTomorrow])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const prepareTask = (task: Partial<Task>): Task => ({
    startTime: task.startTime || 0,
    duration: task.duration || 1,
    activity: task.activity || '',
    isPriority: task.isPriority || false,
    description: task.description || '',
    createdAt: task.createdAt || Date.now(),
    date: task.date || (showTomorrow ? tomorrow : today),
    userId: user?.uid || '',
    completed: task.completed || false
  })

  const saveTask = async (task: Task) => {
    if (!user || !canModifyTasks()) return

    const taskToSave = {
      ...task,
      date: showTomorrow ? tomorrow : today,
      userId: user.uid,
      createdAt: Date.now()
    }

    try {
      if (task.id) {
        await updateDoc(doc(db, 'tasks', task.id), taskToSave)
        const updatedTasks = getCurrentTasks().map(t => 
          t.id === task.id ? { ...taskToSave, id: task.id } : t
        )
        setCurrentTasks(updatedTasks)
      } else {
        const docRef = await addDoc(collection(db, 'tasks'), taskToSave)
        setCurrentTasks([...getCurrentTasks(), { ...taskToSave, id: docRef.id }])
      }
      
      setShowTaskModal(false)
      setEditingTask(null)
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Failed to save task. Please try again.')
    }
  }

  const handleTaskDelete = async (task: Task) => {
    if (!task.id || !user) return
    
    try {
      await deleteDoc(doc(db, 'tasks', task.id))
      setCurrentTasks(getCurrentTasks().filter(t => t.id !== task.id))
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task. Please try again.')
    }
  }

  const handlePriorityToggle = async (task: Task) => {
    // If trying to set as priority, check the current count
    if (!task.isPriority) {
      const currentPriorityCount = getCurrentTasks().filter(t => t.isPriority).length
      if (currentPriorityCount >= 3) {
        alert('You can only have up to 3 priority tasks per day')
        return
      }
    }
    
    handleTaskUpdate(task, { isPriority: !task.isPriority })
  }

  const handleTaskUpdate = async (task: Task, updates: Partial<Task>) => {
    if (!task.id || !user) return

    try {
      const updatedTask = { 
        ...task, 
        ...updates,
        date: showTomorrow ? tomorrow : today
      }
      await updateDoc(doc(db, 'tasks', task.id), updatedTask)
      setCurrentTasks(getCurrentTasks().map(t => 
        t.id === task.id ? updatedTask : t
      ))
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task. Please try again.')
    }
  }

  const getTaskAtHour = (hour: number) => {
    return getCurrentTasks().find(task => 
      hour >= task.startTime && hour < (task.startTime + task.duration)
    )
  }

  const isHourPartOfTask = (hour: number) => {
    return getCurrentTasks().some(task => 
      hour > task.startTime && hour <= (task.startTime + task.duration - 1)
    )
  }

  const isHourSelected = (hour: number) => {
    if (!selectionStart || !selectionEnd) return false
    const start = Math.min(selectionStart, selectionEnd)
    const end = Math.max(selectionStart, selectionEnd)
    return hour >= start && hour <= end
  }

  const canModifyTasks = () => showTomorrow || showFullSchedule

  const handleHourClick = (hour: number) => {
    if (!canModifyTasks()) {
      alert("Switch to edit mode to modify tasks.")
      return
    }

    if (!user) {
      alert('Please sign in to create tasks')
      return
    }

    // Check if there's already a task at this hour
    const existingTask = getTaskAtHour(hour)
    if (existingTask) {
      return
    }

    if (isCombineMode) {
      if (selectionStart === null) {
        setSelectionStart(hour)
        setSelectionEnd(hour)
      } else {
        setSelectionEnd(hour)
      }
    } else {
      const newTask: Task = {
        startTime: hour,
        duration: 1,
        activity: '',
        isPriority: false,
        description: '',
        createdAt: Date.now(),
        date: showTomorrow ? tomorrow : today,
        userId: user.uid,
        completed: false
      }
      setEditingTask(newTask)
      setShowTaskModal(true)
    }
  }

  const createTask = async () => {
    if (!selectionStart || !selectionEnd || !user) return
    
    const start = Math.min(selectionStart, selectionEnd)
    const end = Math.max(selectionStart, selectionEnd)
    const duration = end - start + 1

    // Check for overlapping tasks in the correct date's tasks
    const hasOverlap = getCurrentTasks().some(task => {
      const taskEnd = task.startTime + task.duration - 1
      return (
        (start >= task.startTime && start <= taskEnd) ||
        (end >= task.startTime && end <= taskEnd) ||
        (start <= task.startTime && end >= taskEnd)
      )
    })

    if (hasOverlap) {
      alert('Cannot create task: Time slot overlaps with existing task')
      setIsCombineMode(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      return
    }

    const taskDate = showTomorrow ? tomorrow : today
    const newTask: Partial<Task> = {
      startTime: start,
      duration: duration,
      activity: '',
      isPriority: false,
      description: '',
      createdAt: Date.now(),
      date: taskDate,
      userId: user.uid,
      completed: false
    }

    setEditingTask(newTask as Task)
    setShowTaskModal(true)
    setIsCombineMode(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const isActiveHour = (hour: number) => {
    return activeHours.some(block => hour >= block.start && hour <= block.end)
  }

  const priorityTasksCount = getCurrentTasks().filter(task => task.isPriority).length
  const completedTasksCount = getCurrentTasks().filter(task => task.completed).length
  const completedPriorityCount = getCurrentTasks().filter(task => 
    task.isPriority && task.completed
  ).length
  const totalTasksCount = getCurrentTasks().length

  const [activeHours, setActiveHours] = useState<TimeBlock[]>([
    { start: 6, end: 22 }
  ])

  const handleTaskComplete = async (task: Task) => {
    handleTaskUpdate(task, { completed: !task.completed })
  }

  useEffect(() => {
    console.log('Current date:', showTomorrow ? 'Tomorrow' : 'Today')
    console.log('Tasks:', getCurrentTasks())
  }, [showTomorrow, todayTasks, tomorrowTasks])

  const renderTask = (task: Task, hour: number) => {
    const isEditable = canModifyTasks()
    
    return (
      <motion.div
        className={`
          relative rounded-xl p-4 h-full cursor-pointer
          ${theme === 'dark' 
            ? 'bg-slate-800/50 hover:bg-slate-800/70' 
            : 'bg-white hover:bg-slate-50'
          }
        `}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) {
            if (showFullSchedule) {
              // If in edit mode, go straight to edit
              setEditingTask(task)
              setShowTaskModal(true)
            } else {
              // If not in edit mode, show detail popup
              setEditingTask(task)
              setShowDetailPopup(true)
            }
          }
        }}
      >
        {/* Task content */}
        <div className="flex items-center justify-between gap-2">
          <div className={`text-xs sm:text-sm font-medium whitespace-nowrap
            ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
          >
            {`${formatTime(task.startTime)} - ${formatTime(task.startTime + task.duration)}`}
          </div>
          
          {/* Only render completion button in today's view */}
          {showTomorrow && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleTaskComplete(task)
              }}
              className={`
                group relative px-6 py-4 rounded-2xl transition-all duration-300 
                transform hover:scale-105 hover:-rotate-1
                flex items-center gap-4 min-w-[180px]
                ${task.completed
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-400'
                    : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-600'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 text-slate-300'
                    : 'bg-gradient-to-r from-slate-100 to-white text-slate-700'
                }
                before:absolute before:inset-0 before:rounded-2xl
                before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent
                before:opacity-0 hover:before:opacity-100 before:transition-opacity
                shadow-lg hover:shadow-xl
              `}
              title={task.completed ? "Mark as Incomplete" : "Mark as Complete"}
            >
              <div className="relative flex items-center gap-3 text-lg font-medium tracking-wide">
                <svg 
                  className={`w-6 h-6 transition-transform duration-300
                    ${task.completed ? 'rotate-0' : 'rotate-[-90deg]'}
                  `}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d={task.completed 
                      ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    }
                  />
                </svg>
                <span className={`
                  relative font-semibold uppercase tracking-wider text-sm
                  after:absolute after:bottom-0 after:left-0 after:h-[2px]
                  after:bg-current after:transition-all after:duration-300
                  ${task.completed
                    ? 'after:w-full'
                    : 'after:w-0 group-hover:after:w-full'
                  }
                `}>
                  {task.completed ? (
                    <span className="flex items-center gap-2">
                      COMPLETED
                      <span className="text-xs opacity-60">✨</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      MARK DONE
                      <span className="text-xs animate-pulse">→</span>
                    </span>
                  )}
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Task content without any completion-related styles for tomorrow's view */}
        <div className="flex-1 flex flex-col min-h-0 mb-8">
          <h3 className={`
            text-base sm:text-lg font-medium
            ${!showTomorrow && task.completed ? 'line-through opacity-50' : ''}
            ${theme === 'dark' 
              ? 'text-white' 
              : 'text-zinc-900'
            }
          `}>
            {task.activity || (
              <span className={`italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Click hour to add task
              </span>
            )}
          </h3>
          {task.description && (
            <p className={`
              text-sm mt-1
              ${!showTomorrow && task.completed ? 'line-through opacity-50' : ''}
              ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
            `}>
              {task.description}
            </p>
          )}
        </div>

        {/* Action buttons - Updated to be always visible */}
        {(showTomorrow || showFullSchedule) && (
          <div className="absolute bottom-2 right-2 flex gap-2 
            transition-all duration-300 bg-inherit"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePriorityToggle(task)
              }}
              className={`
                p-1.5 rounded-lg transition-colors
                ${task.isPriority
                  ? theme === 'dark'
                    ? 'bg-blue-500/30 text-blue-400'
                    : 'bg-blue-100 text-blue-600'
                  : theme === 'dark'
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-slate-100 text-slate-600'
                }
              `}
              title="Toggle Priority"
            >
              <svg className="w-4 h-4" fill={task.isPriority ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleTaskDelete(task)
              }}
              className={`
                p-1.5 rounded-lg transition-colors
                ${theme === 'dark'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                }
              `}
              title="Delete Task"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                />
              </svg>
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  // Filter hours to show only those with tasks for Today view
  const getVisibleHours = () => {
    if (showTomorrow || showFullSchedule) {
      return hours
    }
    return hours.filter(hour => getTaskAtHour(hour))
  }

  const handleTaskClick = (task: Task) => {
    if (showFullSchedule) {
      // Direct to edit mode
      setEditingTask(task)
      setShowTaskModal(true)
    } else {
      // Show detail popup first
      setEditingTask(task)
      setShowDetailPopup(true)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Loading your tasks...
              </p>
            </div>
          </div>
        ) : (
          <div className="h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`h-screen overflow-auto ${theme === 'dark' 
      ? 'bg-[#0B1120] text-white' // Deep space blue background
      : 'bg-[#F0F4FF] text-slate-900'
    }`}>
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-grid-pattern opacity-5" /> {/* Add a subtle grid pattern */}
      
      <div className="relative h-full p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header with gaming aesthetic */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="space-y-1">
              <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight
                ${theme === 'dark'
                  ? 'bg-gradient-to-r from-violet-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent'
                }`}
              >
                {format(showTomorrow ? addDays(new Date(), 1) : new Date(), 'EEEE')}
              </h1>
              <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                {format(showTomorrow ? addDays(new Date(), 1) : new Date(), 'MMMM d')}
              </p>
            </div>

            {/* User Authentication Section */}
            <div className="flex flex-wrap items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full
                    ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}
                  >
                    <img 
                      src={user.photoURL || ''} 
                      alt={user.displayName || 'User'} 
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-blue-500"
                    />
                    <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                      {user.displayName?.split(' ')[0]}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium
                      ${theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium 
                    bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Sign in
                </button>
              )}

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-2 sm:p-3 rounded-xl transition-all duration-300 border-2
                  ${theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              
            </div>
          </div>

          {/* Add edit mode indicator HERE - before the stats card */}
          {!showTomorrow && showFullSchedule && (
            <div className={`
              p-4 rounded-xl
              ${theme === 'dark'
                ? 'bg-violet-500/20 border border-violet-500/10'
                : 'bg-violet-50 border border-violet-100'
              }
            `}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className={`font-medium ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                    Edit Mode Active
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    You can now modify today's schedule
                  </p>
                </div>
                <button
                  onClick={() => setShowFullSchedule(false)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium
                    ${theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700'
                      : 'bg-white hover:bg-slate-50'
                    }
                  `}
                >
                  Exit Edit Mode
                </button>
              </div>
            </div>
          )}

          {/* Gaming-style stats card */}
          <div className={`p-6 rounded-2xl border-2 backdrop-blur-xl
            ${theme === 'dark'
              ? 'bg-slate-800/50 border-slate-700'
              : 'bg-white/50 border-slate-200'
            }`}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Today/Tomorrow Toggle - Updated Design */}
              <div className="col-span-2 flex justify-center mb-2">
                <div className={`
                  flex gap-2 p-1.5 rounded-2xl relative
                  ${theme === 'dark' 
                    ? 'bg-slate-800/30 border border-slate-700' 
                    : 'bg-white/30 border border-slate-200'
                  }
                `}>
                  <button
                    onClick={() => {
                      setShowTomorrow(false)
                      if (!showTomorrow) {
                        const currentHourElement = document.getElementById(`hour-${currentHour}`)
                        if (currentHourElement) {
                          currentHourElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }
                    }}
                    className={`
                      px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                      flex items-center gap-2 relative z-10
                      ${!showTomorrow
                        ? theme === 'dark'
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : theme === 'dark'
                          ? 'text-slate-400 hover:text-slate-300'
                          : 'text-slate-600 hover:text-slate-800'
                      }
                    `}
                  >
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    Today
                  </button>
                  <button
                    onClick={() => setShowTomorrow(true)}
                    className={`
                      px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                      flex items-center gap-2 relative z-10
                      ${showTomorrow
                        ? theme === 'dark'
                          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                          : 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                        : theme === 'dark'
                          ? 'text-slate-400 hover:text-slate-300'
                          : 'text-slate-600 hover:text-slate-800'
                      }
                    `}
                  >
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    Plan Tomorrow
                    {showTomorrow && (
                      <span className={`
                        absolute -top-1 -right-1 w-2 h-2 rounded-full
                        animate-ping
                        ${theme === 'dark' ? 'bg-violet-400' : 'bg-violet-500'}
                      `} />
                    )}
                  </button>
                </div>
              </div>

              {showTomorrow ? (
                <>
                  {/* Priority Tasks */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center
                      ${theme === 'dark'
                        ? 'bg-violet-500/20'
                        : 'bg-violet-50'
                      }`}
                    >
                      <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Priority Tasks
                      </p>
                      <p className="text-2xl font-bold">
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                          {priorityTasksCount}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Total Hours Planned */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center
                      ${theme === 'dark'
                        ? 'bg-emerald-500/20'
                        : 'bg-emerald-50'
                      }`}
                    >
                      <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Hours Planned
                      </p>
                      <p className="text-2xl font-bold">
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                          {getCurrentTasks().reduce((total, task) => total + task.duration, 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Tasks Progress */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center
                      ${theme === 'dark'
                        ? 'bg-blue-500/20'
                        : 'bg-blue-50'
                      }`}
                    >
                      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                        />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Tasks Complete
                      </p>
                      <p className="text-2xl font-bold">
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                          {completedTasksCount}
                        </span>
                        <span className={`text-sm ml-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          / {totalTasksCount}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Priority Progress */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center
                      ${theme === 'dark'
                        ? 'bg-violet-500/20'
                        : 'bg-violet-50'
                      }`}
                    >
                      <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Priorities Done
                      </p>
                      <p className="text-2xl font-bold">
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                          {completedPriorityCount}
                        </span>
                        <span className={`text-sm ml-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          / {priorityTasksCount}
                        </span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Add suggestion button when in Today view */}
          {!showTomorrow && !showFullSchedule && (
            <div className="max-w-4xl mx-auto mb-6">
              <button
                onClick={() => setShowFullSchedule(true)}
                className={`
                  w-full p-4 rounded-xl text-left relative overflow-hidden group
                  ${theme === 'dark'
                    ? 'bg-blue-500/20 hover:bg-blue-500/30'
                    : 'bg-blue-50 hover:bg-blue-100'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className={`font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                      Want to modify today's schedule?
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Click here to view and edit all available time slots
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 transform transition-transform group-hover:translate-x-1
                      ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* Task list with gaming aesthetic */}
          <div className="relative">
            {/* Add visual distinction for tomorrow's view */}
            {showTomorrow && (
              <div className={`
                absolute top-2 right-2 px-3 py-1.5 rounded-full
                ${theme === 'dark' 
                  ? 'bg-violet-500/20 border border-violet-500/10' 
                  : 'bg-violet-50 border border-violet-100'
                }
              `}>
                <span className={`
                  text-xs font-medium
                  ${theme === 'dark'
                    ? 'text-violet-400'
                    : 'text-violet-600'
                  }
                `}>
                  Planning Ahead
                </span>
              </div>
            )}

            {/* Your existing tasks grid */}
            <div className="space-y-2">
              {getVisibleHours().map((hour) => {
                const task = getTaskAtHour(hour)
                const isCurrentHour = !showTomorrow && hour === currentHour
                const isPastHour = !showTomorrow && hour < currentHour

                // Skip rendering if this hour is part of a task but not the start hour
                if (isHourPartOfTask(hour)) return null

                return task ? (
                  <motion.div 
                    key={hour}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('button')) {
                        if (showFullSchedule) {
                          // If in edit mode, go straight to edit
                          setEditingTask(task)
                          setShowTaskModal(true)
                        } else {
                          // If not in edit mode, show detail popup
                          setEditingTask(task)
                          setShowDetailPopup(true)
                        }
                      }
                    }}
                    className={`
                      group relative rounded-xl border-2 backdrop-blur-sm
                      transition-all duration-300 hover:scale-[1.02] cursor-pointer
                      ${task.completed ? 'opacity-50' : isPastHour ? 'opacity-50' : ''}
                      ${isCurrentHour ? 'ring-2 ring-offset-2 ring-red-500 ring-offset-black' : ''}
                      ${task.isPriority
                        ? theme === 'dark'
                          ? 'border-blue-500/50 bg-blue-950/50'
                          : 'border-blue-200 bg-blue-50/50'
                        : theme === 'dark'
                          ? 'border-slate-700 bg-slate-800/50'
                          : 'border-slate-200 bg-white/50'
                      }
                    `}
                    style={{ 
                      minHeight: `${task.duration * 3.5}rem`,
                      height: 'auto',
                      zIndex: showTaskModal ? 0 : 10
                    }}
                  >
                    <div className="pl-12 sm:pl-20 pr-12 py-2 sm:py-3 min-h-full flex flex-col relative">
                      {/* Time and completion status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`text-xs sm:text-sm font-medium whitespace-nowrap
                            ${isCurrentHour 
                              ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                              : theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            }`}
                          >
                            {`${formatTime(task.startTime)} - ${formatTime(task.startTime + task.duration)}`}
                          </div>
                          {task.isPriority && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                            </svg>
                          )}
                        </div>
                        {!showTomorrow && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTaskComplete(task)
                            }}
                            className={`
                              p-3 rounded-lg transition-colors flex items-center gap-2
                              ${task.completed
                                ? theme === 'dark'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-green-100 text-green-600'
                                : theme === 'dark'
                                  ? 'bg-slate-700 text-slate-400'
                                  : 'bg-slate-100 text-slate-600'
                              }
                            `}
                            title={task.completed ? "Mark as Incomplete" : "Mark as Complete"}
                          >
                            <svg 
                              className="w-5 h-5" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                d={task.completed 
                                  ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                }
                              />
                            </svg>
                            <span className="font-medium">
                              {task.completed ? "Done" : "Complete"}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Task content with strike-through if completed */}
                      <div className="flex-1 flex flex-col min-h-0 mb-8">
                        <h3 className={`
                          text-base sm:text-lg font-medium
                          ${!showTomorrow && task.completed ? 'line-through opacity-50' : ''}
                          ${theme === 'dark' 
                            ? 'text-white' 
                            : 'text-zinc-900'
                          }
                        `}>
                          {task.activity || (
                            <span className={`italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              Click hour to add task
                            </span>
                          )}
                        </h3>
                        {task.description && (
                          <p className={`
                            text-sm mt-1
                            ${!showTomorrow && task.completed ? 'line-through opacity-50' : ''}
                            ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
                          `}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons - Updated to stop event propagation */}
                      {(showTomorrow || showFullSchedule) && (
                        <div className="absolute bottom-2 right-2 flex gap-2  bg-inherit"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePriorityToggle(task)
                            }}
                            className={`
                              p-1.5 rounded-lg transition-colors
                              ${task.isPriority
                                ? theme === 'dark'
                                  ? 'bg-blue-500/30 text-blue-400'
                                  : 'bg-blue-100 text-blue-600'
                                : theme === 'dark'
                                  ? 'bg-slate-700 text-slate-400'
                                  : 'bg-slate-100 text-slate-600'
                              }
                            `}
                            title="Toggle Priority"
                          >
                            <svg className="w-4 h-4" fill={task.isPriority ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTaskDelete(task)
                            }}
                            className={`
                              p-1.5 rounded-lg transition-colors
                              ${theme === 'dark'
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                              }
                            `}
                            title="Delete Task"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty-${hour}`}
                    onClick={(e) => {
                      e.preventDefault()
                      handleHourClick(hour)
                    }}
                    className={`
                      h-12 sm:h-14 flex items-center pl-12 sm:pl-20 rounded-xl border-2 
                      cursor-pointer transition-all duration-300
                      ${isPastHour ? 'opacity-30' : ''}
                      ${isCurrentHour 
                        ? theme === 'dark'
                          ? 'border-red-500/50 bg-red-500/10 ring-2 ring-offset-2 ring-red-500 ring-offset-black'
                          : 'border-red-200 bg-red-50 ring-2 ring-offset-2 ring-red-500'
                        : isHourSelected(hour)
                          ? theme === 'dark'
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-blue-500 bg-blue-50'
                          : theme === 'dark'
                            ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-700/50'
                            : 'border-slate-200 bg-white/30 hover:bg-slate-50'
                      }
                    `}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`
                        text-xs sm:text-sm font-medium
                        ${isCurrentHour
                          ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                          : isHourSelected(hour)
                            ? 'text-blue-400'
                            : ''
                        }
                      `}>
                        {formatTime(hour)}
                      </span>
                      {isCurrentHour && (
                        <span className={`
                          text-xs px-2 py-0.5 rounded-full animate-pulse
                          ${theme === 'dark' 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-red-50 text-red-600'
                          }
                        `}>
                          Now
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md rounded-2xl p-6 space-y-6
              ${theme === 'dark' 
                ? 'bg-slate-900 border border-slate-800' 
                : 'bg-white border border-slate-200'
              }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                {editingTask?.id ? 'Edit Task' : 'New Task'}
              </h3>
              <div className={`px-3 py-1 rounded-full text-sm
                ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}
              >
                {formatTime(editingTask?.startTime || 0)} - {formatTime((editingTask?.startTime || 0) + (editingTask?.duration || 0))}
              </div>
            </div>

            {/* Task Form */}
            <div className="space-y-4">
              <div>
                <label className={`block mb-2 text-sm font-medium
                  ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Activity
                </label>
                <input
                  type="text"
                  value={editingTask?.activity || ''}
                  onChange={(e) => setEditingTask(prev => 
                    prev ? { ...prev, activity: e.target.value } : null
                  )}
                  className={`w-full px-4 py-3 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-slate-50 border-slate-200'
                    }
                  `}
                  placeholder="What's your focus for this time block?"
                />
              </div>

              <div>
                <label className={`block mb-2 text-sm font-medium
                  ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Description
                </label>
                <textarea
                  value={editingTask?.description || ''}
                  onChange={(e) => setEditingTask(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-slate-50 border-slate-200'
                    }
                  `}
                  placeholder="Add any additional details or notes..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowTaskModal(false)
                  setEditingTask(null)
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors
                  ${theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={() => editingTask && saveTask(editingTask)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-blue-600 hover:bg-blue-500 
                  text-white transition-colors"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {!showTomorrow ? null : (
        <div className="fixed bottom-8 right-8 flex gap-4 z-50">
          <button
            onClick={() => {
              if (isCombineMode) {
                createTask()
              } else {
                setIsCombineMode(true)
              }
            }}
            className={`
              p-4 rounded-full shadow-lg flex items-center gap-2
              transition-all duration-300 transform
              ${isCombineMode
                ? theme === 'dark'
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                : theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-white'
                  : 'bg-white hover:bg-slate-50 text-slate-900'
              }
              ${isCombineMode ? 'scale-110' : 'scale-100'}
            `}
          >
            {isCombineMode ? (
              <>
                <span>Create Combined Task</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Combine Hours</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </>
            )}
          </button>
          {isCombineMode && (
            <button
              onClick={() => {
                setIsCombineMode(false)
                setSelectionStart(null)
                setSelectionEnd(null)
              }}
              className={`
                p-4 rounded-full shadow-lg
                transition-all duration-300
                ${theme === 'dark'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                }
              `}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Add button to return to compact view */}
      {!showTomorrow && showFullSchedule && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={() => setShowFullSchedule(false)}
            className={`
              p-4 rounded-full shadow-lg flex items-center gap-2
              ${theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-white hover:bg-slate-50 text-slate-900'
              }
            `}
          >
            <span>Show Only Tasks</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Detail Popup */}
      {showDetailPopup && editingTask && (
        <TaskDetailPopup
          task={editingTask}
          onClose={() => {
            setShowDetailPopup(false)
            setEditingTask(null)
          }}
          theme={theme || 'light'} // Provide a default value
          isEditMode={showFullSchedule}
          onModify={() => {
            setShowDetailPopup(false)
            setShowTaskModal(true)
          }}
          onPriorityToggle={() => {
            handlePriorityToggle(editingTask)
          }}
          onDelete={() => {
            handleTaskDelete(editingTask)
            setShowDetailPopup(false)
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}


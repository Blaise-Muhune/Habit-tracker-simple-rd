'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { motion } from 'framer-motion'
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
  setDoc,
  getDoc,
  limit
} from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'
import { User } from 'firebase/auth'
import Link from 'next/link'
import { Task, HistoricalTask, UserPreferences, SuggestedTask } from '@/types'
import { Toast } from '@/components/Toast'
import AITaskSuggestions from '../components/AITaskSuggestions'
import { Tour } from '@/components/Tour'
import { useRouter } from 'next/navigation'





const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')
const today = formatDate(new Date())
const tomorrow = formatDate(addDays(new Date(), 1))

const formatTime = (hour: number) => {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour.toString().padStart(2, '0')}:00 ${period}`
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
          </div>

          {/* Description Section - Replacing Additional Details */}
          {task.description && (
            <div className={`rounded-xl p-6
              ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}
            `}>
              <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Description
              </h4>
              <p className={`text-base
                ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
                ${task.completed ? 'line-through opacity-50' : ''}
              `}>
                {task.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer - Action buttons */}
        <div className={`px-6 py-4 border-t
          ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}
        `}>
          <div className="flex justify-between items-center">
            {/* Left side - Priority and Delete buttons */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClose() // Close the modal first
                  onPriorityToggle() // Then toggle priority
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
                  onClose() // Close the modal first
                  onDelete() // Then delete the task
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
  // const [completedPriorities, setCompletedPriorities] = useState<number>(0)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [showDetailPopup, setShowDetailPopup] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  // const [plannedHours, setPlannedHours] = useState(0);
  // const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  // Add this state to manage the collapse state
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(false);
  // Add this near the top where other state variables are defined
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [hasSeenTour, setHasSeenTour] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  // Add this state near your other state declarations
  const [isNavigating, setIsNavigating] = useState(false)

  const router = useRouter()

  const getCurrentTasks = useCallback(() => {
    return showTomorrow ? tomorrowTasks : todayTasks;
  }, [showTomorrow, tomorrowTasks, todayTasks]);

  const setCurrentTasks = (tasks: Task[]) => {
    if (showTomorrow) {
      setTomorrowTasks(tasks)
    } else {
      setTodayTasks(tasks)
    }
  }



  const PremiumUpgradePrompt = () => (
    <div className={`
      p-4 rounded-xl border-2 mb-6
      ${theme === 'dark'
        ? 'bg-violet-500/10 border-violet-500/20'
        : 'bg-violet-50 border-violet-100'
      }
    `}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className={`font-medium ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
            Unlock Premium Features
          </p>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Get AI suggestions and advanced analytics
          </p>
        </div>
        <Link
          href="/premium"
          className={`
            px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${theme === 'dark'
              ? 'bg-violet-500 hover:bg-violet-600 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
            }
          `}
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  )
  
  
  
  
  
  

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

  useEffect(() => {
    if (user) {
      // Check user's premium status
      const checkPremiumStatus = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          setIsPremiumUser(userDoc.data()?.isPremium || false);
        } catch (error) {
          console.error('Error checking premium status:', error);
          setIsPremiumUser(false);
        }
      };
      
      checkPremiumStatus();
    } else {
      setIsPremiumUser(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return
  
    const loadPreferences = async (): Promise<void> => {
      if (!user) return;

      const prefsDoc = await getDoc(doc(db, 'userPreferences', user.uid));
      
      if (prefsDoc.exists()) {
        console.log('User preferences loaded:', prefsDoc.data());
      } else {
        const defaultPrefs: UserPreferences = {
          userId: user.uid,
          emailReminders: true,
          smsReminders: false,
          phoneNumber: '',
          reminderTime: 10,
          email: user.email || '',
          defaultView: 'today',
          pushReminders: false,
          pushSubscription: null
        };
        
        await setDoc(doc(db, 'userPreferences', user.uid), defaultPrefs);
      }
    };
  
    loadPreferences();
  }, [user])

  useEffect(() => {
    if (user && !hasSeenTour) {
      const checkTourStatus = async () => {
        try {
          const tourDoc = await getDoc(doc(db, 'userPreferences', user.uid))
          const hasCompletedTour = tourDoc.data()?.hasCompletedTour
          
          if (!hasCompletedTour) {
            setShowTour(true)
            // Ensure we're on Today view when starting tour
            setShowTomorrow(false)
            setShowFullSchedule(false)
          }
        } catch (error) {
          console.error('Error checking tour status:', error)
        }
      }
      
      checkTourStatus()
    }
  }, [user, hasSeenTour])

  const handleTourComplete = async () => {
    setShowTour(false)
    setHasSeenTour(true)
    
    if (user) {
      try {
        await updateDoc(doc(db, 'userPreferences', user.uid), {
          hasCompletedTour: true,
        })
      } catch (error) {
        console.error('Error saving tour status:', error)
      }
    }
  }

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
          archivedAt: Date.now() // Use current timestamp instead of serverTimestamp()
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

  const getNextTask = (currentHour: number) => {
    return getCurrentTasks()
      .find(task => task.startTime > currentHour);
  };

  const loadTasks = async () => {
    if (!user) {
      setTodayTasks([]);
      setTomorrowTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      // Create a query for tasks with today's and tomorrow's dates
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('date', 'in', [today, tomorrow]),
        orderBy('startTime', 'asc')
      );

      const tasksSnapshot = await getDocs(tasksQuery);
      
      // Convert the snapshot to Task objects with IDs
      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,  // Make sure to include the document ID
        ...doc.data()
      })) as Task[];

      // Separate tasks into today and tomorrow arrays
      const todayTasksList = tasks.filter(task => task.date === today);
      const tomorrowTasksList = tasks.filter(task => task.date === tomorrow);

      console.log('Loaded tasks:', { today: todayTasksList, tomorrow: tomorrowTasksList });

      // Update state
      setTodayTasks(todayTasksList);
      setTomorrowTasks(tomorrowTasksList);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setIsLoading(false);
      showToast('Failed to load tasks', 'error');
    }
  };

  // Make sure this useEffect runs when needed
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]); // Only depend on user changes

  useEffect(() => {
    if (showTomorrow && user) {
      loadSuggestions()
    }
  }, [showTomorrow, user])

  const loadSuggestions = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingSuggestions(true);
    try {

      const last7Days = Array.from({ length: 7 }, (_, i) => 
        formatDate(addDays(new Date(), -(i + 1)))
      )

      const historicalTasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('date', 'in', last7Days),
        limit(30)
      )

      const snapshot = await getDocs(historicalTasksQuery)
      const historicalTasks = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as Task[]
      
      const response = await fetch('/api/generate-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          historicalTasks,
          userId: user.uid  // Add this line
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate suggestions');
      const newSuggestions = await response.json();
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [user]);

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const saveTask = async (task: Task) => {
    if (!user) return;

    try {
      const taskData = {
        ...task,
        userId: user.uid,
        reminderSent: false,
        createdAt: Date.now()
      };

      let savedTaskId: string;
      
      if (task.id) {
        // Update existing task
        await updateDoc(doc(db, 'tasks', task.id), taskData);
        savedTaskId = task.id;
      } else {
        // Create new task
        const docRef = await addDoc(collection(db, 'tasks'), taskData);
        savedTaskId = docRef.id;
      }

      // Create updated task with ID
      const updatedTask = { ...taskData, id: savedTaskId };

      // Update local state based on the date
      if (task.date === today) {
        setTodayTasks(prev => {
          const filtered = prev.filter(t => t.id !== savedTaskId);
          return [...filtered, updatedTask];
        });
      } else {
        setTomorrowTasks(prev => {
          const filtered = prev.filter(t => t.id !== savedTaskId);
          return [...filtered, updatedTask];
        });
      }

      setShowTaskModal(false);
      setEditingTask(null);
      showToast('Task saved successfully', 'success');
    } catch (error) {
      console.error('Error saving task:', error);
      showToast('Failed to save task', 'error');
    }
  };

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
    if (!task.id) return;  // Add this check
    
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
      showToast('Failed to update task. Please try again.', 'error')
    }
  }

  const getTaskAtHour = (hour: number) => {
    return getCurrentTasks().find(task => 
      // Check if the hour is either the start time or within the task duration
      (hour >= task.startTime && hour < (task.startTime + task.duration))
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
    if (!user) {
      showToast('Please sign in to create tasks', 'info')
      return
    }

    // Allow task creation in Tomorrow's tab or when in edit mode (showFullSchedule)
    if (!showTomorrow && !showFullSchedule) {
      showToast("Switch to edit mode to modify tasks.", 'info')
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
        description: '',
        isPriority: false,
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
      showToast('Cannot create task: Time slot overlaps with existing task', 'error')
      setIsCombineMode(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      return
    }

    const taskDate = showTomorrow ? tomorrow : today
    const newTask: Task = {
      startTime: start,
      duration: duration,
      activity: '',
      description: '',
      isPriority: false,
      createdAt: Date.now(),
      date: taskDate,
      userId: user.uid,
      completed: false
    }

    setEditingTask(newTask)
    setShowTaskModal(true)
    setIsCombineMode(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const priorityTasksCount = getCurrentTasks().filter(task => task.isPriority).length
  const completedTasksCount = getCurrentTasks().filter(task => task.completed).length
  const completedPriorityCount = getCurrentTasks().filter(task => 
    task.isPriority && task.completed
  ).length
  const totalTasksCount = getCurrentTasks().length

  const handleTaskComplete = async (task: Task) => {
    
    handleTaskUpdate(task, { completed: !task.completed })
  }

  useEffect(() => {
    console.log('Current date:', showTomorrow ? 'Tomorrow' : 'Today')
    console.log('Tasks:', getCurrentTasks())
  }, [showTomorrow, todayTasks, tomorrowTasks, getCurrentTasks])


  // Filter hours to show only those with tasks for Today view
  const getVisibleHours = () => {
    if (showTomorrow || showFullSchedule) {
      return hours
    }
    // For Today's view, show hours with tasks AND the current hour
    return hours.filter(hour => getTaskAtHour(hour) || hour === currentHour)
  }



  // useEffect(() => {
  //   if (tomorrowTasks) {
      // const totalHours = tomorrowTasks.reduce((total, task) => total + task.duration, 0);
      // setPlannedHours(totalHours);
    // }
  // }, [tomorrowTasks]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    if (showFullSchedule) {
      setShowTaskModal(true)
      setShowDetailPopup(false)
      setEditingTask(task)
    } else {
      setShowTaskModal(false)
      setShowDetailPopup(true)
    }
  }



  // Add this function to handle tour steps
  const getTourSteps = () => [
    // Welcome step
    {
      element: '.tour-header',
      title: 'Welcome to Simple!',
      description: 'Let me show you around and help you get started with organizing your day.'
    },
    // Today/Tomorrow toggle
    {
      element: '.tour-toggle',
      title: 'Switch Views',
      description: 'Toggle between Today and Tomorrow to manage your current tasks or plan ahead.'
    },
    // Stats overview
    {
      element: '.tour-stats',
      title: 'Track Your Progress',
      description: 'Monitor your daily progress, completed tasks, and priorities at a glance.'
    },
    // Timeline - Today view
    {
      element: '.tour-timeline',
      title: 'Your Schedule',
      description: 'This is your daily timeline. Click any hour to add a new task.'
    },
    // Task interaction
    {
      element: '.tour-task',
      title: 'Task Management',
      description: 'Click on a task to view details. You can mark tasks as complete, set priorities, or modify them.'
    },
    // Combine hours feature
    {
      element: '.tour-combine',
      title: 'Combine Hours',
      description: 'Create longer tasks by combining multiple hours together.'
    },
    // Tomorrow planning
    {
      element: '.tour-tomorrow',
      title: 'Plan Tomorrow',
      description: 'Switch to Tomorrow view to plan ahead and get AI-powered task suggestions.'
    },
    // Theme toggle
    {
      element: '.tour-theme',
      title: 'Customize Your View',
      description: 'Switch between light and dark mode for your preferred viewing experience.'
    }
  ]

  // Add tour step navigation functions
  const handleNextStep = () => {
    const steps = getTourSteps()
    if (tourStep < steps.length - 1) {
      setTourStep(prev => prev + 1)
      
      // Handle special cases when moving to next step
      if (steps[tourStep + 1].element === '.tour-tomorrow') {
        setShowTomorrow(true)
      }
    } else {
      handleTourComplete()
    }
  }

  const handlePrevStep = () => {
    if (tourStep > 0) {
      setTourStep(prev => prev - 1)
      
      // Handle special cases when moving to previous step
      if (getTourSteps()[tourStep - 1].element === '.tour-timeline') {
        setShowTomorrow(false)
      }
    }
  }

  return (
    <div className={`h-screen overflow-auto ${theme === 'dark' 
      ? 'bg-[#0B1120] text-white'
      : 'bg-[#F0F4FF] text-slate-900'
    }`}>
      {/* Add Toast component near the top of your JSX */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-grid-pattern opacity-5" /> {/* Add a subtle grid pattern */}
      
      <div className="relative h-full p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header with gaming aesthetic */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 tour-header">
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

            {/* User Authentication Section with Dropdown */}
            <div className="flex justify-end items-center gap-2 sm:gap-3">
              {user ? (
                <div className="relative group">
                  <div className={`flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full cursor-pointer
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
                    {isPremiumUser && (
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${theme === 'dark' 
                          ? 'bg-violet-500/20 text-violet-400' 
                          : 'bg-violet-100 text-violet-600'
                        }`}
                      >
                        Premium
                      </span>
                    )}
                  </div>

                  {/* Updated Dropdown Menu - Added button-like styling */}
                  <div className={`
                    absolute left-0 sm:right-auto mt-2 w-48 py-2 rounded-xl shadow-lg 
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                    transition-all duration-200 z-10
                    ${theme === 'dark' 
                      ? 'bg-slate-800 border border-slate-700' 
                      : 'bg-white border border-slate-200'
                    }
                    translate-x-0 sm:translate-x-0
                    ${window.innerWidth < 640 ? '-translate-x-[calc(100%-44px)]' : ''}
                  `}>
                    {/* Analytics Link - Only show for premium users */}
                    {isPremiumUser && (
                      <Link
                        href="/analytics"
                        onClick={(e) => {
                          e.preventDefault()
                          setIsNavigating(true)
                          router.push('/analytics')
                        }}
                        className={`
                          p-2 rounded-lg transition-colors flex items-center gap-2
                          ${!isPremiumUser 
                            ? theme === 'dark'
                              ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-100/50 text-slate-500 cursor-not-allowed'
                            : theme === 'dark'
                              ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                              : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                          }
                        `}
                      >
                        {isNavigating ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span className="hidden sm:inline">Loading...</span>
                          </div>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                            <span className="hidden sm:inline">
                              {isPremiumUser ? 'View Analytics' : 'Analytics'}
                            </span>
                            {!isPremiumUser && (
                              <span className={`
                                ml-1 px-1.5 py-0.5 text-xs rounded-full
                                ${theme === 'dark' 
                                  ? 'bg-violet-500/20 text-violet-400' 
                                  : 'bg-violet-100 text-violet-600'
                                }
                              `}>
                                PRO
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    )}

                    {/* Premium/Account link - Updated styling */}
                    <Link
                      href="/premium"
                      className={`block w-full px-4 py-2 text-sm transition-colors
                        ${theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700/70 active:bg-slate-600'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                        }
                        hover:scale-[0.98] transform duration-100
                        mx-auto my-0.5 rounded-lg
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                          />
                        </svg>
                        {isPremiumUser ? 'Manage Premium' : 'Upgrade to Pro'}
                      </div>
                    </Link>

                    {/* Preferences Link - Updated styling */}
                    <Link
                      href="/preferences"
                      className={`block w-full px-4 py-2 text-sm transition-colors
                        ${theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700/70 active:bg-slate-600'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                        }
                        hover:scale-[0.98] transform duration-100
                        mx-auto my-0.5 rounded-lg
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Preferences
                      </div>
                    </Link>

                    {/* Feedback Link - Updated styling */}
                    <Link
                      href="/feedback"
                      className={`block w-full px-4 py-2 text-sm transition-colors
                        ${theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700/70 active:bg-slate-600'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                        }
                        hover:scale-[0.98] transform duration-100
                        mx-auto my-0.5 rounded-lg
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                          />
                        </svg>
                        Send Feedback
                      </div>
                    </Link>

                    {/* Sign out button - Updated styling */}
                    <button
                      onClick={() => {
                        fetch('/api/notifications', {
                          method: 'GET',
                        })
                      }}
                      className={`w-full px-4 py-2 text-sm transition-colors text-left
                        ${theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700/70 active:bg-slate-600'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                        }
                        hover:scale-[0.98] transform duration-100
                        mx-auto my-0.5 rounded-lg
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        run function test
                      </div>
                    </button>
                    

                    <button
                      onClick={logout}
                      className={`w-full px-4 py-2 text-sm transition-colors text-left
                        ${theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700/70 active:bg-slate-600'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                        }
                        hover:scale-[0.98] transform duration-100
                        mx-auto my-0.5 rounded-lg
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign Out
                      </div>
                    </button>
                  </div>
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

          

          {/* Gaming-style stats card */}
          <div className={`p-6 rounded-2xl border-2 backdrop-blur-xl
            ${theme === 'dark'
              ? 'bg-slate-800/50 border-slate-700'
              : 'bg-white/50 border-slate-200'
            }`}
          >
            <div className="grid grid-cols-2 gap-4 tour-stats">
              {/* Today/Tomorrow Toggle - Updated Design */}
              <div className="col-span-2 flex justify-center mb-2 tour-toggle">
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
                  {/* Add this near your other main navigation buttons */}
                  {(
                    <Link
                      href={isPremiumUser ? '/analytics' : '/premium'}
                      className={`
                        p-2 rounded-lg transition-colors flex items-center gap-2
                        ${!isPremiumUser 
                          ? theme === 'dark'
                            ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-100/50 text-slate-500 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                            : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                        }
                      `}

                    >
                      {isNavigating ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span className="hidden sm:inline">Loading...</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          <span className="hidden sm:inline">
                            {isPremiumUser ? 'View Analytics' : 'Analytics'}
                          </span>
                          {!isPremiumUser && (
                            <span className={`
                              ml-1 px-1.5 py-0.5 text-xs rounded-full
                              ${theme === 'dark' 
                                ? 'bg-violet-500/20 text-violet-400' 
                                : 'bg-violet-100 text-violet-600'
                              }
                            `}>
                              PRO
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )}
                
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

          {/* AI Suggestions Section - Now positioned right after stats */}
          {showTomorrow && (
            <>
              {/* AI Suggestions Section */}
              {isPremiumUser ? (
                <AITaskSuggestions
                  theme={theme || 'light'}
                  isPremiumUser={isPremiumUser}
                  isSuggestionsExpanded={isSuggestionsExpanded}
                  setIsSuggestionsExpanded={setIsSuggestionsExpanded}
                  suggestions={suggestions}
                  isLoadingSuggestions={isLoadingSuggestions}
                  loadSuggestions={loadSuggestions}
                  getCurrentTasks={getCurrentTasks}
                  setEditingTask={setEditingTask}
                  setShowTaskModal={setShowTaskModal}
                  setCurrentTasks={setCurrentTasks}
                  setSuggestions={setSuggestions}
                  user={user as User}
                />
              ) : (
                <PremiumUpgradePrompt />
              )}
            </>
          )}

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
                      Modify today&apos;s schedule
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

          {/* Show AI Suggestions when in edit mode for Today */}
          {!showTomorrow && showFullSchedule && (
          ( isPremiumUser) ?(
            <AITaskSuggestions
                  theme={theme || 'light'}
                  isPremiumUser={isPremiumUser}
                  isSuggestionsExpanded={isSuggestionsExpanded}
                  setIsSuggestionsExpanded={setIsSuggestionsExpanded}
                  suggestions={suggestions}
                  isLoadingSuggestions={isLoadingSuggestions}
                  loadSuggestions={loadSuggestions}
                  getCurrentTasks={getCurrentTasks}
                  setEditingTask={setEditingTask}
                  setShowTaskModal={setShowTaskModal}
                  setCurrentTasks={setCurrentTasks}
                  setSuggestions={setSuggestions}
                  user={user as User}
                />
          ): (<PremiumUpgradePrompt />))}

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

            {/* Edit mode indicator - Now sticky */}
            {!showTomorrow && showFullSchedule && (
              <div className={`
                sticky top-0 z-50 -mx-8 px-8 py-4
                backdrop-blur-lg
                ${theme === 'dark'
                  ? 'bg-[#0B1120]/80'
                  : 'bg-[#F0F4FF]/80'
                }
              `}>
                <div className="flex justify-between items-center">
                  <div 
                    onClick={() => setShowFullSchedule(false)}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer
                      transition-colors duration-200
                      ${theme === 'dark'
                        ? 'bg-violet-500/20 border border-violet-500/10 hover:bg-violet-500/30'
                        : 'bg-violet-50 border border-violet-100 hover:bg-violet-100'
                      }
                    `}
                  >
                    <span className={`
                      text-sm font-medium
                      ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}
                    `}>
                      Edit Mode Active
                    </span>
                    <div className={`w-2 h-2 rounded-full animate-pulse
                      ${theme === 'dark' ? 'bg-violet-400' : 'bg-violet-500'}
                    `} />
                    <svg 
                      className={`w-4 h-4 ml-2 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Your existing tasks grid */}
            <div className="space-y-2 tour-timeline">
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
                        handleTaskClick(task);
                      }
                    }}
                    className={`
                      group relative rounded-xl border-2 backdrop-blur-sm
                      transition-all duration-300 hover:scale-[1.02] cursor-pointer
                      ${task.completed ? 'opacity-50' : isPastHour ? 'opacity-50' : ''}
                      ${(!showTomorrow && (
                        isCurrentHour || 
                        (currentHour >= task.startTime && currentHour < (task.startTime + task.duration))
                      )) ? 'ring-2 ring-offset-2 ring-red-500 ring-offset-black' : ''}
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

                    {/* Add a "Current" indicator if this task includes the current hour */}
                    {!showTomorrow && currentHour >= task.startTime && currentHour < (task.startTime + task.duration) && (
                      <div className={`
                        absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium
                        ${theme === 'dark' 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-red-50 text-red-600'
                        }
                      `}>
                        Current
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty-${hour}`}
                    onClick={(e) => {
                      e.preventDefault()
                      if (canModifyTasks()) {
                        handleHourClick(hour)
                      }
                    }}
                    className={`
                      h-12 sm:h-14 flex items-center pl-12 sm:pl-20 rounded-xl border-2 
                      cursor-${canModifyTasks() ? 'pointer' : 'default'} transition-all duration-300
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
                    whileHover={{ scale: canModifyTasks() ? 1.02 : 1 }}
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
                        <div className="flex items-center gap-2">
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full animate-pulse
                          ${theme === 'dark' 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-red-50 text-red-600'
                            }
                          `}>
                            Now
                          </span>
                          {/* Add "Next Task" indicator if applicable */}
                          {!showTomorrow && !task && (
                            <span className={`
                              text-xs
                              ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
                            `}>
                              {getNextTask(hour)
                                ? `Next: ${getNextTask(hour)?.activity} at ${formatTime(getNextTask(hour)?.startTime || 0)}`
                                : 'No upcoming tasks'
                              }
                            </span>
                          )}
                        </div>
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
      {showTaskModal && editingTask && (
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
                { formatTime(editingTask?.startTime || 0)} - {formatTime((editingTask?.startTime || 0) + (editingTask?.duration || 0))}
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

      {/* Combined Edit Mode Controls - Remove exit button */}
      {!showTomorrow && showFullSchedule && (
        <div className="fixed bottom-8 right-8 flex gap-4 z-50 tour-combine">
          {isCombineMode ? (
            <>
              <button
                onClick={createTask}
                className={`
                  p-4 rounded-full shadow-lg flex items-center gap-2
                  transition-all duration-300 transform scale-110
                  ${theme === 'dark'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                <span>Create Combined Task</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
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
            </>
          ) : (
            <button
              onClick={() => setIsCombineMode(true)}
              className={`
                p-4 rounded-full shadow-lg flex items-center gap-2
                ${theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-white'
                  : 'bg-white hover:bg-slate-50 text-slate-900'
                }
              `}
            >
              <span>Combine Hours</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Tomorrow's View Combine Button */}
      {showTomorrow && (
        <div className="fixed bottom-8 right-8 flex gap-4 z-50 tour-combine">
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

      {/* Detail Popup */}
      {showDetailPopup && selectedTask && (
        <TaskDetailPopup
          task={selectedTask}
          onClose={() => {
            setShowDetailPopup(false)
            setSelectedTask(null)
          }}
          theme={theme || 'light'}
          isEditMode={showTomorrow || showFullSchedule}
          onModify={() => {
            setEditingTask(selectedTask)
            setShowTaskModal(true)
          }}
          onPriorityToggle={() => handlePriorityToggle(selectedTask)}
          onDelete={() => handleTaskDelete(selectedTask)}
        />
      )}

      {showTour && (
        <Tour
          steps={getTourSteps()}
          currentStep={tourStep}
          onNext={handleNextStep}
          onPrev={handlePrevStep}
          onComplete={handleTourComplete}
          onSkip={handleTourComplete} // Use the same handler as complete
          theme={theme || 'light'}
        />
      )}
    </div>
  )
}

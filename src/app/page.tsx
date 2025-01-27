'use client';
import { useState, useEffect, useCallback, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import {  db } from '@/lib/firebase'
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
  setDoc,
  getDoc,
  limit
} from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'
// import { User } from 'firebase/auth'
import Link from 'next/link'
import { Task, UserPreferences, TaskSuggestion } from '@/types'
import { Toast } from '@/components/Toast'
import { Tour } from '@/components/Tour'
import { useRouter } from 'next/navigation'

// Add this constant near the top of the file
const DESCRIPTION_MAX_LENGTH = 280; // About 2 tweets worth of characters

const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')
const today = format(new Date(),"EEEE")
const todayDate = format(new Date(),"yyyy-MM-dd")
const tomorrow = format(addDays(new Date(), 1), "EEEE")
const tomorrowDate = format(addDays(new Date(), 1), "yyyy-MM-dd")


const formatTime = (time: number) => {
  const hours = Math.floor(time)
  const minutes = Math.round((time % 1) * 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = hour + (minute / 60)
      options.push({
        value: time,
        label: formatTime(time)
      })
    }
  }
  return options
}

const TaskDetailPopup = ({ 
  task, 
  onClose, 
  theme, 
  isEditMode,
  onModify,
  onPriorityToggle,
}: {
  task: Task
  onClose: () => void
  theme: string
  isEditMode: boolean
  onModify: (updatedTask: Task) => void
  onPriorityToggle: () => void
  onDelete: () => void
}) => {
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const [selectedStartTime, setSelectedStartTime] = useState(task.startTime)
  const selectedDuration = task.duration
  const timeOptions = generateTimeOptions()

  const handleTimeChange = (newStartTime: number) => {
    setSelectedStartTime(newStartTime)
    // Update the task with new time
    onModify({
      ...task,
      startTime: newStartTime,
      duration: selectedDuration
    })
  }

  

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
              {/* Time Display/Picker */}
              <div
                onClick={() => isEditMode && setIsTimePickerOpen(!isTimePickerOpen)}
                className={`relative px-3 py-1 rounded-full text-sm cursor-pointer
                  ${theme === 'dark' 
                    ? isEditMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-800'
                    : isEditMode ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-100'
                  }
                `}
              >
                {formatTime(selectedStartTime)} - {formatTime(selectedStartTime + selectedDuration)}
                
                {/* Time Picker Dropdown */}
                {isTimePickerOpen && isEditMode && (
                  <div className={`
                    absolute top-full left-0 mt-2 p-2 rounded-lg shadow-lg z-50
                    ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}
                    max-h-60 overflow-y-auto w-48
                  `}>
                    {timeOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleTimeChange(option.value)}
                        className={`
                          w-full text-left px-3 py-1.5 rounded text-sm
                          ${selectedStartTime === option.value
                            ? theme === 'dark'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-blue-100 text-blue-600'
                            : theme === 'dark'
                              ? 'text-slate-400 hover:bg-slate-700'
                              : 'text-slate-600 hover:bg-slate-100'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
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
              {/* <button
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
              </button> */}
            </div>

            {/* Right side - Modify and Close buttons */}
            <div className="flex gap-3">
              {isEditMode && (
                <button
                  onClick={() => {
                    onClose()
                    onModify(task)
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
  const { user, logout } = useAuth()
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
const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false)
const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false)
  // const [plannedHours, setPlannedHours] = useState(0);
  // const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  // Add this state to manage the collapse state
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
  // Add new state for time block view preference
  const [timeBlockView, setTimeBlockView] = useState<'hour' | 'halfHour'>('hour')
  // Add a new state for tomorrow's view
  const [tomorrowTimeBlockView, setTomorrowTimeBlockView] = useState<'hour' | 'halfHour'>('hour')

  // Add these refs near your other state declarations
  const startTimeDropdownRef = useRef<HTMLDivElement>(null);
  const endTimeDropdownRef = useRef<HTMLDivElement>(null);
  const startTimeButtonRef = useRef<HTMLButtonElement>(null);
  const endTimeButtonRef = useRef<HTMLButtonElement>(null);

  const [showPreviousDaySuggestions, setShowPreviousDaySuggestions] = useState(false)
  const [suggestedTasks, setSuggestedTasks] = useState<Task[]>([])

  // Add new state to track accepted suggestions


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

  useEffect(() => {
    // When start time picker opens, scroll to the selected time
    if (isStartTimePickerOpen && editingTask?.startTime !== undefined) {
      const timeElement = document.getElementById(`start-time-${editingTask.startTime}`)
      if (timeElement) {
        timeElement.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
    }
  }, [isStartTimePickerOpen, editingTask?.startTime])
  
  useEffect(() => {
    if (!showTomorrow) {
      const scrollToCurrentTime = () => {
        const currentHourElement = document.getElementById(`hour-${currentHour}`);
        if (currentHourElement) {
          currentHourElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          });
        }
      };
      
      // Small delay to ensure elements are rendered
      const timeoutId = setTimeout(scrollToCurrentTime, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [showTomorrow, currentHour, showFullSchedule]);
  useEffect(() => {
    if (!showTomorrow && !isLoading) {
      const currentHourElement = document.getElementById(`hour-${currentHour}`)
      if (currentHourElement) {
        setTimeout(() => {
          currentHourElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 500) // Small delay to ensure elements are rendered
      }
    }
  }, [showTomorrow, isLoading, currentHour])

    // Add this useEffect to handle click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        // For start time dropdown
        if (isStartTimePickerOpen && 
            startTimeDropdownRef.current && 
            startTimeButtonRef.current && 
            !startTimeDropdownRef.current.contains(event.target as Node) &&
            !startTimeButtonRef.current.contains(event.target as Node)) {
          setIsStartTimePickerOpen(false);
        }
        
        // For end time dropdown
        if (isEndTimePickerOpen && 
            endTimeDropdownRef.current && 
            endTimeButtonRef.current && 
            !endTimeDropdownRef.current.contains(event.target as Node) &&
            !endTimeButtonRef.current.contains(event.target as Node)) {
          setIsEndTimePickerOpen(false);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isStartTimePickerOpen, isEndTimePickerOpen]);
  
  
   // Add this function to reset all state
   const resetState = () => {
    setTodayTasks([])
    setTomorrowTasks([])
    setShowTomorrow(false)
    setIsCombineMode(false)
    setSelectionStart(null)
    setSelectionEnd(null)
    setEditingTask(null)
    setShowTaskModal(false)
    setShowFullSchedule(false)
    setShowDetailPopup(false)
    setIsStartTimePickerOpen(false)
    setIsEndTimePickerOpen(false)
    setIsPremiumUser(false)
    setToast(null)
    setSelectedTask(null)
    setShowTour(false)
    setTourStep(0)
    setIsNavigating(false)
    setTimeBlockView('hour')
    setTomorrowTimeBlockView('hour')
  }

  // Modify fetchPreviousDayTasks to use stored suggestions
  const fetchPreviousDayTasks = useCallback(async () => {
    if (!user) {
      console.log('No user found, skipping fetch')
      return
    }

    try {
      const targetDay = format(addDays(new Date(), 1), 'EEEE').toLowerCase()
      console.log('Fetching suggestions for day:', targetDay)
      
      const suggestionsQuery = query(
        collection(db, 'taskSuggestions'),
        where('userId', '==', user.uid),
        where('day', '==', targetDay),
        where('processed', '==', false),
        orderBy('confidence', 'desc')
      )

      console.log('Query params:', {
        userId: user.uid,
        day: targetDay,
        processed: false
      })

      const snapshot = await getDocs(suggestionsQuery)
      console.log('Raw Firestore response:', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))

      const suggestions = snapshot.docs.map(doc => ({
        ...(doc.data() as Omit<TaskSuggestion, 'id'>),
        id: doc.id
      })) as TaskSuggestion[]
      
      console.log('Parsed suggestions:', suggestions)

      const suggestedTasks = suggestions.map(suggestion => ({
        activity: suggestion.activity,
        startTime: suggestion.startTime,
        duration: suggestion.duration,
        description: suggestion.description,
        date: tomorrowDate,
        userId: user.uid,
        day: targetDay,
        suggested: true,
        isPriority: false,
        completed: false,
        createdAt: Date.now()
      })) as Task[]

      console.log('Converted to tasks:', suggestedTasks)

      setSuggestedTasks(suggestedTasks)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      showToast('Failed to load task suggestions', 'error')
    }
  }, [user, tomorrowDate])

  // Add effect to fetch suggestions when toggle is turned on
  useEffect(() => {
    if (showPreviousDaySuggestions) {
      fetchPreviousDayTasks()
    } else {
      setSuggestedTasks([])
    }
  }, [showPreviousDaySuggestions, fetchPreviousDayTasks])

  useEffect(() => {
    if (user) {
      // Check if this is a new user by looking for any existing tasks
      const checkNewUser = async () => {
        try {
          const tasksQuery = query(
            collection(db, 'tasks'),
            where('userId', '==', user.uid),
            limit(1)
          );
          
          const snapshot = await getDocs(tasksQuery);
          
          if (snapshot.empty) {
            // Create onboarding task at current hour
            const currentHour = new Date().getHours();
            const onboardingTask: Task = {
              userId: user.uid,
              activity: "🎉 Welcome! Click me to view More",
              description: "This is your first task! click on  'Modify today's Schedule' above to edit your schedule. \n Click 'Plan Tomorrow' to add tasks for tomorrow. \n Click on any hour to create a new task, or click this task to see more details. \n You can mark tasks as complete, set priorities, and plan for tomorrow. \n One Day at a Time",
              startTime: currentHour,
              duration: 1,
              date: formatDate(new Date()),
              completed: false,
              isPriority: true,
              createdAt: Date.now(),
              reminderSent: false
            };

            // Save to Firebase
            const docRef = await addDoc(collection(db, 'tasks'), onboardingTask);
            
            // Update local state
            setTodayTasks(prev => [...prev, { ...onboardingTask, id: docRef.id }]);
            
            // Also set tour to show
            setShowTour(true);
            setTourStep(0);
          }
        } catch (error) {
          console.error('Error creating onboarding task:', error);
        }
      };

      checkNewUser();
    }
  }, [user]); // Only run when user changes
  
  // update user timezone
  useEffect(() => {
    if (user) {
      updateDoc(doc(db, 'userPreferences', user.uid), {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
  }, []);
  

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])


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
          pushSubscription: null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
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

  const handleLogout = async () => {
    try {
      await logout()
      resetState()
      // Optionally show a toast message
      showToast('Successfully signed out', 'success')
    } catch (error) {
      console.error('Error signing out:', error)
      showToast('Failed to sign out', 'error')
    }
    router.push('/signin')
  }


  const loadTasks = async () => {
    if (!user) {
      setTodayTasks([]);
      setTomorrowTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('date', 'in', [todayDate, tomorrowDate]), // Use the formatted dates
        orderBy('startTime', 'asc')
      );

      const tasksSnapshot = await getDocs(tasksQuery);
      
      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      // Explicitly filter based on the exact date string
      const todayTasksList = tasks.filter(task => task.date === todayDate);
      const tomorrowTasksList = tasks.filter(task => task.date === tomorrowDate);

      console.log('Loaded tasks:', { 
        today: todayTasksList, 
        tomorrow: tomorrowTasksList,
        todayDate,
        tomorrowDate
      });

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
      // loadSuggestionsToday()
      // loadSuggestionsTomorrow()
    }
  }, [showTomorrow, user])


  // First, update the generateTimeOptions function to include all 15-minute intervals
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = hour + (minute / 60)
        options.push({
          value: time,
          label: formatTime(time)
        })
      }
    }
    return options
  }

  // Then update the timeSlots array to include all 15-minute intervals
  const timeSlots = Array.from({ length: 96 }, (_, i) => i / 4)  // Creates [0, 0.25, 0.5, 0.75, 1, ...]

  const getVisibleHours = () => {
    const currentTimeBlockView = showTomorrow ? tomorrowTimeBlockView : timeBlockView;
    
    // Get all tasks' start times
    const taskStartTimes = getCurrentTasks().map(task => task.startTime);
    
    // Filter time slots based on view type and tasks
    return timeSlots.filter(timeSlot => {
      // Always show slots where tasks start
      const hasTaskStarting = taskStartTimes.includes(timeSlot);
      
      // Show slots with ongoing tasks
      const hasTaskDuring = getTaskAtHour(timeSlot);
      
      // Show current hour slot
      const isCurrentHourSlot = timeSlot === Math.floor(currentHour * 2) / 2;
      
      // For hour view, show hour marks
      const isHourMark = Number.isInteger(timeSlot);
      
      // For 30-min view, show half-hour marks
      const isHalfHourMark = timeSlot % 0.5 === 0;
      
      // In tomorrow or full schedule view, show based on view type
      if (showTomorrow || showFullSchedule) {
        return currentTimeBlockView === 'hour' 
          ? isHourMark || hasTaskStarting // Show hour marks and task starts
          : isHalfHourMark || hasTaskStarting; // Show half-hour marks and task starts
      }
      
      // In today view (not edit mode), only show slots with tasks or current hour
      return hasTaskStarting || hasTaskDuring || isCurrentHourSlot;
    }).sort((a, b) => a - b); // Ensure slots are in order
  };

  const saveTask = async (task: Task) => {
    if (!user) return;

    try {
      // Explicitly set the date based on which view we're in
      const taskDate = showTomorrow ? tomorrowDate : todayDate;
      
      const taskData = {
        ...task,
        userId: user.uid,
        reminderSent: false,
        createdAt: Date.now(),
        date: taskDate, // Make sure we're using the correct date
        day: format(showTomorrow ? addDays(new Date(), 1) : new Date(), 'EEEE').toLowerCase()
      };

      let savedTaskId: string;
      
      if (task.id) {
        await updateDoc(doc(db, 'tasks', task.id), taskData);
        savedTaskId = task.id;
      } else {
        const docRef = await addDoc(collection(db, 'tasks'), taskData);
        savedTaskId = docRef.id;
      }

      // Create updated task with ID
      const updatedTask = { ...taskData, id: savedTaskId };

      // Update local state based on showTomorrow flag
      if (showTomorrow) {
        setTomorrowTasks(prev => {
          const filtered = prev.filter(t => t.id !== savedTaskId);
          return [...filtered, updatedTask];
        });
      } else {
        setTodayTasks(prev => {
          const filtered = prev.filter(t => t.id !== savedTaskId);
          return [...filtered, updatedTask];
        });
      }

      setShowTaskModal(false);
      setEditingTask(null);
      showToast('Task saved successfully', 'success');
      return task
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
        date: showTomorrow ? tomorrowDate : todayDate,
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

  const getTaskAtHour = (timeSlot: number) => {
    return getCurrentTasks().find(task => {
      const taskEnd = task.startTime + task.duration;
      // Check if the time slot falls within the task's duration
      return timeSlot >= task.startTime && timeSlot < taskEnd;
    });
  };

  const isHourPartOfTask = (timeSlot: number) => {
    return getCurrentTasks().some(task => {
      const taskEnd = task.startTime + task.duration;
      // Check if the time slot falls within the task's duration, but not at the start
      return timeSlot > task.startTime && timeSlot < taskEnd;
    });
  };


  const isHourSelected = (timeSlot: number) => {
    if (!selectionStart || !selectionEnd) return false
    const start = Math.min(selectionStart, selectionEnd)
    const end = Math.max(selectionStart, selectionEnd)
    return timeSlot >= start && timeSlot <= end
  }


  const handleHourClick = (timeSlot: number) => {
    if (!user) {
      showToast('Please sign in to create tasks', 'info')
      return
    }

    if (!showTomorrow && !showFullSchedule) {
      showToast("Switch to edit mode to modify tasks.", 'info')
      return
    }

    const existingTask = getTaskAtHour(timeSlot)
    if (existingTask) {
      return
    }

    if (isCombineMode) {
      if (selectionStart === null) {
        setSelectionStart(timeSlot)
        setSelectionEnd(timeSlot)
      } else {
        setSelectionEnd(timeSlot)
      }
    } else {
      // Get the current view setting based on whether we're in tomorrow or today view
      const currentView = showTomorrow ? tomorrowTimeBlockView : timeBlockView
      
      // Set duration based on current view
      const defaultDuration = currentView === 'hour' ? 1 : 0.5

      // Get the day of the week
      const taskDate = showTomorrow ? addDays(new Date(), 1) : new Date();
      const dayOfWeek = format(taskDate, 'EEEE').toLowerCase();

      const newTask: Task = {
        startTime: timeSlot,
        duration: defaultDuration,
        activity: '',
        description: '',
        isPriority: false,
        createdAt: Date.now(),
        date: showTomorrow ? tomorrowDate : todayDate,
        userId: user.uid,
        completed: false,
        day: dayOfWeek // Add the day property
      }
      setEditingTask(newTask)
      setShowTaskModal(true)
    }
  }


  const createTask = async () => {
    if (!selectionStart || !selectionEnd || !user) return
    
    const start = Math.min(selectionStart, selectionEnd)
    const end = Math.max(selectionStart, selectionEnd)
    const duration = end - start + 0.5

    // Check for overlapping tasks
    const hasOverlap = getCurrentTasks().some(task => {
      const taskEnd = task.startTime + task.duration - 0.5
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

    const taskDate = showTomorrow ? addDays(new Date(), 1) : new Date();
    const dayOfWeek = format(taskDate, 'EEEE').toLowerCase();

    const newTask: Task = {
      startTime: start,
      duration: duration,
      activity: '',
      description: '',
      isPriority: false,
      createdAt: Date.now(),
      date: showTomorrow ? tomorrowDate : todayDate,
      userId: user.uid,
      completed: false,
      day: dayOfWeek // Add the day property
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  if (isLoading) {
    // Only show loading state if there's a user and we're actually loading data
    if (user) {
      return (
        <div className="min-h-screen p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Loading your tasks...
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    // If no user is signed in, set loading to false and continue to render the main UI
    setIsLoading(false);
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    if (showTomorrow || showFullSchedule) {
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
      description: 'Let me show you around and help you get started with organizing your tasks efficiently.'
    },
    // Today/Tomorrow toggle
    {
      element: '.tour-toggle',
      title: 'Switch Between Views',
      description: 'Toggle between Today and Tomorrow views. Today shows your current schedule, while Tomorrow lets you plan ahead. The current time is automatically highlighted in Today view.'
    },
    // Stats overview
    {
      element: '.tour-stats',
      title: 'Track Your Progress',
      description: 'Monitor your daily progress here. See completed tasks, priority items, and total hours planned. The stats update automatically as you manage your tasks.'
    },
    // Timeline - Today view
    {
      element: '.tour-timeline',
      title: 'Your Schedule Timeline',
      description: 'This is your daily timeline. In Today view, you\'ll see your current time highlighted. Tasks are color-coded: blue for regular tasks, purple for priorities, and completed tasks are faded.'
    },
    // View options
    {
      element: '.tour-view-options',
      title: 'Customize Your View',
      description: 'Switch between 1-hour and 30-minute time slots for more precise scheduling. AI suggestions are available for premium users to help plan your day.'
    },
    // Task interaction
    {
      element: '.tour-task',
      title: 'Task Management',
      description: 'Click any task to view details or edit. Mark tasks as complete, set priorities, or delete them. In Tomorrow view, you can drag tasks to reschedule them.'
    },
    // Priority system
    {
      element: '.tour-priority',
      title: 'Priority System',
      description: 'Mark up to 3 important tasks as priorities. They\'ll be highlighted and tracked separately in your stats. Complete priority tasks first for better productivity.'
    },
    // AI Suggestions
    {
      element: '.tour-ai',
      title: 'AI Task Suggestions',
      description: 'Premium users get smart task suggestions based on their patterns. The AI learns from your schedule to help you plan more effectively.'
    },
    // Theme toggle
    {
      element: '.tour-theme',
      title: 'Personalize Your Experience',
      description: 'Switch between light and dark modes for your preferred viewing experience. Your choice is remembered across sessions.'
    },
    // Final step
    {
      element: '.tour-header',
      title: 'You\'re All Set!',
      description: 'Start by adding tasks to your schedule. Remember to check your progress and update task statuses throughout the day. Need help? Click the user menu for more options.'
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
  

  // Add this near your other click handlers
  // const handleNotificationCheck = async () => {
  //   // Try multiple methods to get timezone
  //   const timezone = 
  //     Intl.DateTimeFormat().resolvedOptions().timeZone || 
  //     Intl.DateTimeFormat().resolvedOptions().timeZone || 
  //     new Date().getTimezoneOffset() !== 0 ? 
  //       getTimezoneFromOffset(new Date().getTimezoneOffset()) : 
  //       'UTC';

  //   console.log('Detected timezone:', timezone);

  //   const idtoken = await auth.currentUser?.getIdToken();
  //   const response = await fetch('/api/weekly-task-analysis', {
  //     method: 'GET',
  //     headers: {
  //       'Authorization': `Bearer ${idtoken}`,
  //       'Content-Type': 'application/json'
  //     },

  //   });
  //   // const response = await fetch('/api/notifications', {
  //   //   method: 'GET',
  //   // });

  //   const data = await response.json();
  //   console.log('Notification check response:', data);
  // };

  // Helper function to get approximate timezone from offset
  // function getTimezoneFromOffset(offset: number): string {
  //   const hours = Math.abs(Math.floor(offset / 60));
  //   return `Etc/GMT${offset <= 0 ? '+' : '-'}${hours}`;
  // }

  // Add this helper function for time options
  // const generateTimeOptions = () => {
  //   const options = []
  //   for (let hour = 0; hour < 24; hour++) {
  //     for (let minute = 0; minute < 60; minute += 15) {
  //       const time = hour + (minute / 60)
  //       options.push({
  //         value: time,
  //         label: formatTime(time)
  //       })
  //     }
  //   }
  //   return options
  // }

  // Add the tomorrow view filter component
  const ViewFilter = ({ timeBlockView, setTimeBlockView }: { timeBlockView: "hour" | "halfHour", setTimeBlockView: (timeBlockView: "hour" | "halfHour") => void }) => (
    <div className={`
      sticky top-0 z-50 -mx-8 px-8 py-4
      
    `}>
      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
        {/* View: */}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => setTimeBlockView('hour')}
          className={`
            px-3 py-1 rounded text-sm font-medium transition-colors
            ${timeBlockView === 'hour'
              ? theme === 'dark'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-blue-100 text-blue-600'
              : theme === 'dark'
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-600 hover:text-slate-800'
          }
        `}
        >
          1 Hour
        </button>
        <button
          onClick={() => setTimeBlockView('halfHour')}
          className={`
            px-3 py-1 rounded text-sm font-medium transition-colors
            ${timeBlockView === 'halfHour'
              ? theme === 'dark'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-blue-100 text-blue-600'
              : theme === 'dark'
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-600 hover:text-slate-800'
          }
        `}
        >
          30 Min
        </button>
      <SuggestionsToggle />
      </div>

    </div>
  )

  // Add helper function to check for time conflicts
  const hasTimeConflict = (startTime: number, endTime: number, excludeTaskId?: string) => {
    return getCurrentTasks().some(task => {
      if (excludeTaskId && task.id === excludeTaskId) return false
      const taskEnd = task.startTime + task.duration
      return (
        (startTime >= task.startTime && startTime < taskEnd) ||
        (endTime > task.startTime && endTime <= taskEnd) ||
        (startTime <= task.startTime && endTime >= taskEnd)
      )
    })
  }

  // Add this useEffect for initial scroll to current time
  

  // Add new state variables


  // Add this function to fetch tasks from previous similar days
  

  // Modify handleAcceptSuggestion to directly save to Firebase and update state
  const handleAcceptSuggestion = async (suggestedTask: Task) => {
    try {
      const { id, ...taskWithoutId } = suggestedTask
      const newTask = {
        ...taskWithoutId,
        date: tomorrowDate,
        userId: user?.uid,
        createdAt: Date.now(),
        completed: false,
        isPriority: false
      }
      console.log(':Id removed', id)

      // Save to Firebase and update tomorrow's tasks
      await saveTask(newTask as Task)
      
      // Remove from suggestions
      setSuggestedTasks(prev => prev.filter(t => 
        t.activity !== suggestedTask.activity || 
        t.startTime !== suggestedTask.startTime
      ))
      
      showToast('Task added successfully', 'success')
    } catch (error) {
      console.error('Error accepting suggested task:', error)
      showToast('Failed to add task', 'error')
    }
  }

  // Add this near your other JSX components
  const SuggestionsToggle = () => (
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-lg
        ${theme === 'dark' 
          ? 'bg-slate-800/50 border border-slate-700' 
          : 'bg-white/50 border border-slate-200'
        }
      `}>
        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          AI Suggs
        </span>
        <button
          disabled={!isPremiumUser}
          onClick={() => setShowPreviousDaySuggestions(!showPreviousDaySuggestions)}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 rounded-full 
            transition-colors duration-200 ease-in-out
            ${isPremiumUser ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}
            
            ${showPreviousDaySuggestions 
              ? theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
              : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
            }
          `}
        >
          <span className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full 
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${showPreviousDaySuggestions ? 'translate-x-5' : 'translate-x-0'}
          `} />
        </button>
        {!isPremiumUser && (
                              <span 
                              onClick={() => {
                                router.push('/premium')
                              }}
                              className={`
                                ml-1 px-1.5 py-0.5 text-xs rounded-full cursor-pointer
                                ${theme === 'dark' 
                                  ? 'bg-violet-500/20 text-violet-400' 
                                  : 'bg-violet-100 text-violet-600'
                                }
                              `}>
                                PRO
                              </span>
                            )}
      </div>
  )
  // Modify your task rendering to include suggested tasks

  const isCurrentTimeInTask = (task: Task) => {
    const now = new Date();
    const currentTimeInHours = now.getHours() + (now.getMinutes() / 60);
    return currentTimeInHours >= task.startTime && 
           currentTimeInHours < (task.startTime + task.duration);
  };
  

  const renderTimeSlot = (timeSlot: number) => {
    const isPastTimeSlot = !showTomorrow && timeSlot < currentHour;
    const task = getTaskAtHour(timeSlot);
    const currentTimeInHours = new Date().getHours() + (new Date().getMinutes() / 60);
    
    // Update isCurrentTime logic to only show in Today view
    const isCurrentTime = (() => {
      if (showTomorrow) return false; // Never show current time indicator in Tomorrow view
      
      const currentView = timeBlockView;
      if (currentView === 'hour') {
        // For hour view, show indicator if current time is within the hour
        const timeSlotHour = Math.floor(timeSlot);
        return timeSlotHour === Math.floor(currentTimeInHours);
      } else {
        // For half-hour view, show indicator if current time is within the 30-min slot
        return timeSlot <= currentTimeInHours && currentTimeInHours < (timeSlot + 0.5);
      }
    })();

    const suggestedTask = showPreviousDaySuggestions && 
      suggestedTasks.find(t => t.startTime === timeSlot && !getCurrentTasks().some(ct => 
        ct.startTime === t.startTime && ct.activity === t.activity
      ));

    if (isHourPartOfTask(timeSlot)) return null;

    // If there's a real task, render it normally
    if (task) {
      const isActiveTask = !showTomorrow && isCurrentTime && isCurrentTimeInTask(task);
      return (
        <motion.div 
        key={timeSlot}
        id={`hour-${Math.floor(timeSlot)}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) {
            handleTaskClick(task);
          }
        }}
        className={`
          group relative rounded-xl border-2 backdrop-blur-sm
          transition-all duration-300 hover:scale-[1.02] cursor-pointer
          shadow-sm hover:shadow-md
          ${task.completed ? 'opacity-20' : isPastTimeSlot ? 'opacity-50' : ''}
          ${isActiveTask ? 'ring-2 ring-red-500 shadow-lg' : ''}
          ${task.isPriority
            ? theme === 'dark'
              ? 'border-blue-500/50 bg-gradient-to-br from-blue-950/50 to-slate-900/50'
              : 'border-blue-200 bg-gradient-to-br from-blue-50/90 to-white'
            : theme === 'dark'
              ? 'border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50'
              : 'border-slate-200 bg-gradient-to-br from-slate-50/90 to-white'
          }
          ${task.completed 
            ? theme === 'dark'
              ? 'border-sky-500/50 bg-gradient-to-br from-sky-950/50 to-slate-900/50'
              : 'border-sky-200 bg-gradient-to-br from-sky-50/90 to-white'
            : ''
          }
        `}
        style={{ 
          minHeight: `${task.duration * 3.5}rem`,
          height: 'auto'
        }}
      >
        {/* Time indicator with gradient line */}
        <div className={`
          absolute left-0 top-1/2 -translate-y-1/2 px-3 py-1.5 
          rounded-r-xl text-xs font-medium flex flex-col items-center
          ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
        `}>
          <div>{formatTime(task.startTime)}</div>
          <div className={`w-0.5 h-4 my-1 rounded-full
            ${task.isPriority
              ? theme === 'dark'
                ? 'bg-gradient-to-b from-blue-500 to-transparent'
                : 'bg-gradient-to-b from-blue-400 to-transparent'
              : theme === 'dark'
                ? 'bg-gradient-to-b from-slate-400 to-transparent'
                : 'bg-gradient-to-b from-slate-500 to-transparent'
            }
          `}></div>
          <div>{formatTime(task.startTime + task.duration)}</div>
        </div>
         {/* Add Now indicator for active tasks */}
      {isActiveTask && (
        <div className={`
          absolute right-0 top-1 -translate-y-1/2 -translate-x-1
          flex items-center  py-1 rounded-r-full
          z-10
        `}>
         
        </div>
      )}
          <div className="pl-14 sm:pl-20 pr-4 py-3 min-h-full flex flex-col relative">
          <div className="flex items-center justify-between gap-4">
            <h3 className={`text-lg font-medium px-1 transition-colors
              ${task.isPriority 
                ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                : theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
              }
              group-hover:${theme === 'dark' ? 'text-white' : 'text-slate-900'}
            `}>
              {task.activity}
            </h3>
            <div className="flex gap-2 items-center opacity-80 group-hover:opacity-100 transition-opacity">
                  {!showTomorrow && !showFullSchedule ? (
                    <div className="flex gap-2">
                      {/* Priority Toggle */}
                  <button
                  onClick={() => handleTaskComplete(task)}
                  className={`p-2 rounded-lg transition-colors
                    ${theme === 'dark'
                      ? task.completed ? 'text-sky-400 ' : 'text-gray-400'
                      : task.completed ? 'text-sky-400 ' : 'text-gray-600'
                    }
                    ${task.completed ? 'opacity-100' : 'opacity-70 hover:opacity-100'}
                  `}
                  title={task.completed ? "Mark as undone" : "Mark as done"}
                > 
                {task.completed ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              ):(
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 7l-5 5m0-5l5 5"
                />
               </svg>)}
                  
                </button>
               </div>
             ):''}
                <button
                onClick={() => handlePriorityToggle(task)}
                className={`p-1 rounded-lg transition-colors
                  ${theme === 'dark'
                  ? ' text-blue-400'
                  : ' text-blue-600'
                  }
                  ${task.isPriority ? 'opacity-100' : 'opacity-70 hover:opacity-100'}
                  `}
                  >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                      </svg>
                </button>
                { showFullSchedule || showTomorrow ? (<button
                  onClick={() => handleTaskDelete(task)}
                  className={`p-1 rounded-lg transition-colors
                    ${theme === 'dark'
                      ? ' text-red-400'
                      : ' text-red-600'
                    }
                    opacity-50 hover:!opacity-100
                  `}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>):''}
              </div>
            </div>
            {/* {task.description && (
              <p className={`
                mt-1 text-sm opacity-75 line-clamp-2 overflow-hidden
                ${task.completed ? 'line-through opacity-50' : ''}
                ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
              `}>
                {task.description}
              </p>
            )} */}
          </div>
        </motion.div>
      )
    }

    // If there's a suggested task and suggestions are enabled, render it
    if (suggestedTask) {
      const isSaved = getCurrentTasks().some(t => 
        t.activity === suggestedTask.activity && 
        t.startTime === suggestedTask.startTime
      )

      // If task is already saved, don't render it again
      if (isSaved) return null

      return (
        <motion.div 
          key={`suggested-${timeSlot}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            group relative rounded-xl border-2 border-dashed
            transition-all duration-300 opacity-60 hover:opacity-100
            ${theme === 'dark'
              ? 'border-slate-600 bg-slate-800/30'
              : 'border-slate-300 bg-slate-50/30'
            }
          `}
          style={{ 
            minHeight: `${suggestedTask.duration * 3.5}rem`,
            height: 'auto'
          }}
        >
          <div className={`
          absolute left-0 top-1/2 -translate-y-1/2 px-3 py-1 rounded-tl-xl rounded-br-xl text-xs font-medium
          ${theme === 'dark' 
            ? 'text-slate-400' 
            : 'text-slate-600'
          }
        `}>
          <div className="flex flex-col items-center">
            <div>{formatTime(suggestedTask.startTime)}</div>
            <div>|</div>
            <div>{formatTime(suggestedTask.startTime + suggestedTask.duration)}</div>
          </div>
        </div>
          <div className="pl-12 sm:pl-20 pr-12 py-2 sm:py-3 min-h-full flex flex-col relative">
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-sm opacity-75 ${theme === 'dark' ? 'text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg' : 'text-slate-600 bg-slate-100/50 px-2 py-1 rounded-lg'}`}>
                  Suggested Task
                </span>
                <h3 className="text-lg font-medium mt-1">{suggestedTask.activity}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptSuggestion(suggestedTask)}
                  className={`p-1 rounded-lg transition-colors
                    ${theme === 'dark'
                      ? 'hover:bg-green-500/20 text-green-400'
                      : 'hover:bg-green-100 text-green-600'
                    }
                  `}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setSuggestedTasks(prev => prev.filter(t => 
                      t.activity !== suggestedTask.activity || 
                      t.startTime !== suggestedTask.startTime
                    ))
                  }}
                  className={`p-1 rounded-lg transition-colors
                    ${theme === 'dark'
                      ? 'hover:bg-red-500/20 text-red-400'
                      : 'hover:bg-red-100 text-red-600'
                    }
                  `}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {suggestedTask.description && (
              <p className="mt-1 text-sm opacity-75">{suggestedTask.description}</p>
            )}
          </div>
        </motion.div>
      )
    }

    // Otherwise render empty time slot
    return (
      <div
      key={timeSlot}
      id={`hour-${Math.floor(timeSlot)}`}
      onClick={() => handleHourClick(timeSlot)}
      className={`
        relative rounded-xl border-2 border-dashed transition-colors cursor-pointer
        ${isHourSelected(timeSlot)
          ? theme === 'dark'
            ? 'border-blue-500/50 bg-blue-950/50'
            : 'border-blue-200 bg-blue-50/50'
          : theme === 'dark'
            ? 'border-slate-700/50 hover:border-slate-600'
            : 'border-slate-300/50 hover:border-slate-300'
        }
      `}
  >
    <div className="pl-12 sm:pl-20 pr-4 py-2 sm:py-3">
      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
        {formatTime(timeSlot)}
      </span>
      {/* Current time indicator - Updated condition */}
      {!showTomorrow && isCurrentTime && (
          <div className={`
            absolute left-0 top-1/2 -translate-y-1/2
            flex items-center gap-1 px-1 py-1 rounded-r-full
          `}>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className={`text-xs font-medium
              ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}
            `}>
              {/* Now */}
            </span>
          </div>
        )}
    </div>
  </div>
)
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M6 9L12 15L18 9" 
                        fill="currentColor"
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                    {isPremiumUser && (
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${theme === 'dark' 
                          ? 'bg-violet-500/20 text-violet-400' 
                          : 'bg-violet-100 text-violet-600'
                        }
                      `}>
                        Premium
                      </span>
                    )}
                  </div>

                  {/* Updated Dropdown Menu - Added button-like styling */}
                  <div className={`
                    absolute right-0 sm:right-auto mt-2 w-48 py-2 rounded-xl shadow-lg 
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                    transition-all duration-200 z-10 
                    ${theme === 'dark' 
                      ? 'bg-slate-800 border border-slate-700' 
                      : 'bg-white border border-slate-200'
                    }
                    translate-x-0 sm:translate-x-0
                    ${window.innerWidth < 640 ? '-translate-x-[calc(100%-44px)]' : ''}
                  `}>
                   

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
                    {/* <button
                      onClick={handleNotificationCheck}
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
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 00-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        Check Notifications
                      </div>
                    </button> */}
                    

                    <button
                      onClick={handleLogout}
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
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        Sign Out
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/signin"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium 
                    bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Sign in
                </Link>
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
                      setShowPreviousDaySuggestions(false)
                      if (!showTomorrow) {
                        const currentHourElement = document.getElementById(`hour-${currentHour}`)
                        if (currentHourElement) {
                          currentHourElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                    onClick={() => {
                      setShowTomorrow(true)
                      setShowPreviousDaySuggestions(false)
                    }}
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
                            Progress
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

          {showTomorrow && (
            <ViewFilter timeBlockView={tomorrowTimeBlockView} setTimeBlockView={setTomorrowTimeBlockView} />
          )}



          {/* Add suggestion button when in Today view */}
          {!showTomorrow && !showFullSchedule && (
            <div className="max-w-4xl mx-auto mb-6">
              <button
                onClick={() => {
                  
                    // setShowTomorrow(false)
                    if (!showTomorrow) {
                      const currentHourElement = document.getElementById(`hour-${currentHour}`)
                      if (currentHourElement) {
                        currentHourElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }
                    setShowFullSchedule(true)
                  }
                  }
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
                <div className="flex flex-row justify-between items-center">
                  <div className=" flex-col flex items-s gap-4">
                    <div 
                      onClick={() => setShowFullSchedule(false)}
                      className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer
                        transition-colors duration-200 w-fit
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
                        Edit
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

                    {/* Time Block View Filter */}
                    <ViewFilter timeBlockView={timeBlockView} setTimeBlockView={setTimeBlockView} />
                  {/* <SuggestionsToggle /> */}
                  </div>
                </div>
              </div>
            )}

            {/* Your existing tasks grid */}
            <div className="space-y-2 tour-timeline">
              {getVisibleHours().map(timeSlot => renderTimeSlot(timeSlot))}
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
            className={`w-full max-w-lg rounded-2xl overflow-hidden
              ${theme === 'dark' 
                ? 'bg-slate-900 border border-slate-800' 
                : 'bg-white border border-slate-200'
              }
            `}
          >
            {/* Modal Header with integrated actions */}
            <div className={`px-6 py-4 border-b flex items-center justify-between
              ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}
            `}>
              <h2 className={`text-lg font-semibold
                ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
              `}>
                {editingTask.id ? 'Edit Task' : 'New Task'}
              </h2>
              
              <div className="flex items-center gap-2">
                {/* Save Button */}
                <button
                  onClick={() => {
                    saveTask(editingTask)
                    setIsStartTimePickerOpen(false)
                    setIsEndTimePickerOpen(false)
                  }}
                  disabled={
                    editingTask.duration <= 0 || 
                    hasTimeConflict(
                      editingTask.startTime,
                      editingTask.startTime + editingTask.duration,
                      editingTask.id
                    ) ||
                    !editingTask.activity.trim()
                  }
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${editingTask.duration <= 0 || 
                      hasTimeConflict(
                        editingTask.startTime,
                        editingTask.startTime + editingTask.duration,
                        editingTask.id
                      ) ||
                      !editingTask.activity.trim()
                      ? theme === 'dark'
                        ? 'bg-blue-500/50 text-blue-300 cursor-not-allowed'
                        : 'bg-blue-300 text-white cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-blue-500 text-white hover:bg-blue-400'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                  }
                `}
              >
                Save
              </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                    setIsStartTimePickerOpen(false)
                    setIsEndTimePickerOpen(false)
                  }}
                  className={`p-2 rounded-lg transition-colors
                    ${theme === 'dark'
                      ? 'text-slate-400 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Task Form */}
            <div className="p-6 space-y-6">
              {/* Time Selection */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium
                  ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
                `}>
                  Time
                </label>
                <div className="flex items-center gap-3">
                  {/* Start Time Dropdown */}
                  <div className="relative flex-1">
                    <button
                      ref={startTimeButtonRef}
                      onClick={() => setIsStartTimePickerOpen(!isStartTimePickerOpen)}
                      className={`w-full px-3 py-2 text-left rounded-lg text-sm
                        ${theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200'
                        }
                      `}
                    >
                      {formatTime(editingTask.startTime)}
                    </button>
                    
                    {isStartTimePickerOpen && (
                      <div 
                        ref={startTimeDropdownRef}
                        className={`
                          absolute top-full left-0 mt-1 w-48 max-h-60 overflow-y-auto
                          rounded-lg shadow-lg z-50
                          ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}
                        `}
                      >
                        {generateTimeOptions().map(option => {
                          const endTime = editingTask.startTime + editingTask.duration;
                          const wouldConflict = hasTimeConflict(
                            option.value, 
                            endTime,
                            editingTask.id
                          )
                          
                          return (
                            <button
                              key={option.value}
                              id={`start-time-${option.value}`} // Add this ID
                              onClick={() => {
                                if (!wouldConflict) {
                                  setEditingTask({
                                    ...editingTask,
                                    startTime: option.value,
                                    duration: endTime - option.value
                                  })
                                  setIsStartTimePickerOpen(false)
                                  // Scroll to the selected time
                                  const timeElement = document.getElementById(`start-time-${option.value}`)
                                  if (timeElement) {
                                    timeElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                  }
                                }
                              }}
                              className={`
                                w-full text-left px-3 py-1.5 text-sm
                                ${wouldConflict 
                                  ? theme === 'dark'
                                    ? 'bg-red-500/10 text-red-400 cursor-not-allowed'
                                    : 'bg-red-50 text-red-600 cursor-not-allowed'
                                  : editingTask.startTime === option.value
                                    ? theme === 'dark'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-blue-100 text-blue-600'
                                    : theme === 'dark'
                                      ? 'text-slate-400 hover:bg-slate-700'
                                      : 'text-slate-600 hover:bg-slate-100'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <span>{option.label}</span>
                                {wouldConflict && (
                                  <span className="text-xs">
                                    Conflict
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>to</span>

                  {/* End Time Dropdown */}
                  <div className="relative flex-1">
                    <button
                      ref={endTimeButtonRef}
                      onClick={() => setIsEndTimePickerOpen(!isEndTimePickerOpen)}
                      className={`w-full px-3 py-2 text-left rounded-lg text-sm
                        ${theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200'
                        }
                      `}
                    >
                      {formatTime(editingTask.startTime + editingTask.duration)}
                    </button>
                    
                    {isEndTimePickerOpen && (
                      <div 
                        ref={endTimeDropdownRef}
                        className={`
                          absolute top-full left-0 mt-1 w-48 max-h-60 overflow-y-auto
                          rounded-lg shadow-lg z-50
                          ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}
                        `}
                      >
                        {generateTimeOptions()
                          .filter(option => option.value > editingTask.startTime)
                          .map(option => {
                            const wouldConflict = hasTimeConflict(
                              editingTask.startTime, 
                              option.value,
                              editingTask.id
                            )
                            
                            return (
                              <button
                                key={option.value}
                                data-time={option.value}  // Add data attribute for scrolling
                                onClick={() => {
                                  if (!wouldConflict) {
                                    setEditingTask({
                                      ...editingTask,
                                      duration: option.value - editingTask.startTime
                                    })
                                    setIsEndTimePickerOpen(false)
                                  }
                                }}
                                className={`
                                  w-full text-left px-3 py-1.5 text-sm
                                  ${wouldConflict 
                                    ? theme === 'dark'
                                      ? 'bg-red-500/10 text-red-400 cursor-not-allowed'
                                      : 'bg-red-50 text-red-600 cursor-not-allowed'
                                    : (editingTask.startTime + editingTask.duration) === option.value
                                      ? theme === 'dark'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-blue-100 text-blue-600'
                                      : theme === 'dark'
                                        ? 'text-slate-400 hover:bg-slate-700'
                                        : 'text-slate-600 hover:bg-slate-100'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{option.label}</span>
                                  {wouldConflict && (
                                    <span className="text-xs">
                                      Conflict
                                    </span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Time validation error message */}
                {editingTask.duration <= 0 && (
                  <p className={`text-sm mt-1
                    ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}
                  `}>
                    End time must be after start time
                  </p>
                )}
              </div>

              {/* Rest of the form fields */}
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

              <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className={`block text-sm font-medium
                ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}
              `}>
                Description (optional)
              </label>
              <span className={`text-xs
                ${editingTask.description.length >= DESCRIPTION_MAX_LENGTH
                  ? 'text-red-500'
                  : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }
              `}>
                {editingTask.description.length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <textarea
              value={editingTask.description}
              onChange={(e) => {
                if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                  setEditingTask(prev => prev ? {
                    ...prev,
                    description: e.target.value
                  } : null)
                }
              }}
              className={`w-full px-4 py-2 rounded-lg border resize-none
                ${theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
                }
              `}
              placeholder="Add details (optional)"
              rows={3}
            />
          </div>
            </div>
            {/* </div> */}
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

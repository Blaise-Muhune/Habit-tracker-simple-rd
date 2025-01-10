'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { HistoricalTask } from '@/types'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { format, subDays  } from 'date-fns'
import { motion } from 'framer-motion'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const calculateComplexityScore = (tasks: HistoricalTask[]): number => {
  if (tasks.length === 0) return 0;
  
  return tasks.reduce((score, task) => {
    let taskScore = 1
    if (task.isPriority) taskScore += 2
    if (task.duration) taskScore += task.duration / 60 // Convert minutes to hours
    return score + taskScore
  }, 0) / tasks.length
}

const calculateFocusBlocks = (tasks: HistoricalTask[]): Record<string, number> => {
  return tasks.reduce((acc, task) => {
    const hour = task.startTime
    acc[hour] = (acc[hour] || 0) + (task.duration || 0)
    return acc
  }, {} as Record<string, number>)
}

const calculateCollaborationMetrics = (tasks: HistoricalTask[]): Record<string, number> => {
  // Placeholder implementation - modify based on your needs
  return {
    collaborativeTasks: tasks.filter(task => task.category === 'Collaboration').length,
  }
}

const calculateFocusScore = (focusBlocks: Record<string, number>): number => {
  const totalMinutes = Object.values(focusBlocks).reduce((sum, minutes) => sum + minutes, 0)
  const numberOfBlocks = Object.keys(focusBlocks).length
  return numberOfBlocks > 0 ? totalMinutes / numberOfBlocks : 0
}

interface WeeklyData {
  date: string
  total: number
  completed: number
}

interface TaskTrend {
  date: string
  trend: number
}

export default function AnalyticsPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState({
    completionRate: 0,
    totalTasks: 0,
    priorityCompletion: 0,
    averageTasksPerDay: 0,
    mostProductiveHour: 0,
    weeklyData: [] as WeeklyData[],
    categoryDistribution: {} as Record<string, number>,
    timeDistribution: {} as Record<string, number>,
    averageCompletionTime: 0,
    taskTrends: [] as TaskTrend[],
    overdueTasks: 0,
    recurringTaskSuccess: 0,
    taskComplexityScore: 0,
    focusTimeBlocks: {} as Record<string, number>,
    collaborationMetrics: {} as Record<string, number>,
  })

  const loadAnalyticsData = async () => {
    if (!user) return

    try {
      // Get last 30 days of historical tasks
      const thirtyDaysAgo = subDays(new Date(), 30)
      const historicalTasksQuery = query(
        collection(db, 'taskHistory'),
        where('userId', '==', user.uid),
        where('actualDate', '>=', format(thirtyDaysAgo, 'yyyy-MM-dd'))
      )

      const snapshot = await getDocs(historicalTasksQuery)
      const historicalTasks = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as HistoricalTask[]

      // Calculate metrics
      const completedTasks = historicalTasks.filter(task => task.completed)
      const priorityTasks = historicalTasks.filter(task => task.isPriority)
      const completedPriorityTasks = priorityTasks.filter(task => task.completed)

      // Group tasks by day for weekly analysis
      const tasksByDay = historicalTasks.reduce((acc, task) => {
        const date = task.actualDate
        if (!acc[date]) acc[date] = []
        acc[date].push(task)
        return acc
      }, {} as Record<string, HistoricalTask[]>)

      // Calculate time distribution
      const timeDistribution = historicalTasks.reduce((acc, task) => {
        const hour = task.startTime
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Find most productive hour
      const mostProductiveHour = Object.entries(timeDistribution)
        .sort(([,a], [,b]) => b - a)[0][0]

      // Calculate new metrics
      const averageCompletionTime = historicalTasks.reduce((acc, task) => {
        return acc + (task.completionTime || 0)
      }, 0) / completedTasks.length

      const overdueTasks = historicalTasks.filter(task => 
        task.dueDate && new Date(task.dueDate) < new Date(task.completedDate || '')
      ).length

      setAnalyticsData({
        completionRate: (completedTasks.length / historicalTasks.length) * 100,
        totalTasks: historicalTasks.length,
        priorityCompletion: (completedPriorityTasks.length / priorityTasks.length) * 100,
        averageTasksPerDay: historicalTasks.length / 30,
        mostProductiveHour: parseInt(mostProductiveHour),
        weeklyData: Object.entries(tasksByDay).map(([date, tasks]) => ({
          date,
          total: tasks.length,
          completed: tasks.filter(t => t.completed).length,
        })),
        categoryDistribution: historicalTasks.reduce((acc, task) => {
          const category = task.category || 'Uncategorized'
          acc[category] = (acc[category] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        timeDistribution,
        averageCompletionTime,
        overdueTasks,
        taskComplexityScore: calculateComplexityScore(historicalTasks),
        focusTimeBlocks: calculateFocusBlocks(historicalTasks),
        collaborationMetrics: calculateCollaborationMetrics(historicalTasks),
        taskTrends: [],
        recurringTaskSuccess: 0
      })
    } catch (error) {
      console.error('Error loading analytics data:', error)
    }
  }

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!user) {
        router.push('/')
        return
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setIsPremiumUser(userData.isPremium || false)
          
          if (userData.isPremium) {
            await loadAnalyticsData()
          }
        } else {
          setIsPremiumUser(false)
        }
      } catch (error) {
        console.error('Error checking premium status:', error)
        setIsPremiumUser(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkPremiumStatus()
  }, [user, router, loadAnalyticsData])

  if (isLoading) {
    return (
      <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" />
        </div>
      </div>
    )
  }

  if (!isPremiumUser) {
    return (
      <div className="min-h-screen p-8">
        <div className={`
          max-w-2xl mx-auto p-8 rounded-2xl
          ${theme === 'dark'
            ? 'bg-slate-800/90 border border-slate-700'
            : 'bg-white/90 border border-slate-200'
          }
        `}>
          <h1 className={`text-3xl font-bold mb-4 
            ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
          `}>
            Premium Analytics
          </h1>
          <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            Upgrade to Premium to access detailed analytics and insights about your productivity.
          </p>
          <button
            onClick={() => router.push('/premium')}
            className={`
              px-6 py-3 rounded-xl text-white font-medium
              transition-all duration-200 transform hover:scale-105
              bg-gradient-to-r from-violet-500 to-purple-500
              hover:from-violet-600 hover:to-purple-600
            `}
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-2xl sm:text-3xl font-bold 
            ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
          `}>
            Analytics Dashboard
          </h1>
          <button
            onClick={() => router.push('/')}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium
              ${theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-50 text-slate-600'
              }
            `}
          >
            Back
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              title: 'Task Completion Rate',
              value: `${analyticsData.completionRate.toFixed(1)}%`,
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
            },
            {
              title: 'Priority Tasks',
              value: `${analyticsData.priorityCompletion.toFixed(1)}%`,
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
            },
            {
              title: 'Daily Tasks',
              value: analyticsData.averageTasksPerDay.toFixed(1),
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
            },
            {
              title: 'Peak Hour',
              value: format(new Date().setHours(analyticsData.mostProductiveHour), 'ha'),
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
            },
          ].map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                p-4 rounded-xl border
                ${theme === 'dark'
                  ? 'bg-slate-800/90 border-slate-700'
                  : 'bg-white border-slate-200'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {metric.icon}
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {metric.title}
                  </p>
                  <p className={`text-xl font-bold 
                    ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
                  `}>
                    {metric.value}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Weekly Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              p-4 sm:p-6 rounded-2xl border
              ${theme === 'dark'
                ? 'bg-slate-800/90 border-slate-700'
                : 'bg-white border-slate-200'
              }
            `}
          >
            <h2 className={`text-xl font-bold mb-4
              ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
            `}>
              Weekly Progress
            </h2>
            <Line
              data={{
                labels: analyticsData.weeklyData.map(d => format(new Date(d.date), 'MMM d')),
                datasets: [
                  {
                    label: 'Total Tasks',
                    data: analyticsData.weeklyData.map(d => d.total),
                    borderColor: theme === 'dark' ? '#60A5FA' : '#3B82F6',
                    tension: 0.4,
                  },
                  {
                    label: 'Completed Tasks',
                    data: analyticsData.weeklyData.map(d => d.completed),
                    borderColor: theme === 'dark' ? '#34D399' : '#10B981',
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: theme === 'dark' ? '#1F2937' : '#F3F4F6',
                    },
                  },
                },
              }}
            />
          </motion.div>

          {/* Time Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              p-4 sm:p-6 rounded-2xl border
              ${theme === 'dark'
                ? 'bg-slate-800/90 border-slate-700'
                : 'bg-white border-slate-200'
              }
            `}
          >
            <h2 className={`text-xl font-bold mb-4
              ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
            `}>
              Task Distribution by Hour
            </h2>
            <Bar
              data={{
                labels: Object.keys(analyticsData.timeDistribution).map(
                  hour => format(new Date().setHours(parseInt(hour)), 'ha')
                ),
                datasets: [{
                  label: 'Tasks',
                  data: Object.values(analyticsData.timeDistribution),
                  backgroundColor: theme === 'dark' ? '#8B5CF6' : '#7C3AED',
                }],
              }}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: theme === 'dark' ? '#1F2937' : '#F3F4F6',
                    },
                  },
                },
              }}
            />
          </motion.div>

          {/* Category Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              p-4 sm:p-6 rounded-2xl border lg:col-span-2
              ${theme === 'dark'
                ? 'bg-slate-800/90 border-slate-700'
                : 'bg-white border-slate-200'
              }
            `}
          >
            <h2 className={`text-xl font-bold mb-4
              ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
            `}>
              Task Categories
            </h2>
            <div className="h-[300px]">
              <Doughnut
                data={{
                  labels: Object.keys(analyticsData.categoryDistribution),
                  datasets: [{
                    data: Object.values(analyticsData.categoryDistribution),
                    backgroundColor: [
                      '#8B5CF6',
                      '#EC4899',
                      '#10B981',
                      '#F59E0B',
                      '#EF4444',
                    ],
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Detailed Metrics Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6
          `}
        >
          {[
            {
              title: 'Task Completion',
              stats: [
                {
                  label: 'Total Tasks',
                  value: analyticsData.totalTasks,
                  detail: 'tasks tracked'
                },
                {
                  label: 'Completion Rate',
                  value: `${analyticsData.completionRate.toFixed(1)}%`,
                  detail: analyticsData.completionRate > 75 ? 'Excellent progress!' : 'Keep pushing forward!'
                }
              ]
            },
            {
              title: 'Time Management',
              stats: [
                {
                  label: 'Average Completion',
                  value: `${(analyticsData.averageCompletionTime / 60).toFixed(1)}h`,
                  detail: 'per task'
                },
                {
                  label: 'Overdue Tasks',
                  value: analyticsData.overdueTasks,
                  detail: analyticsData.overdueTasks === 0 ? 'Perfect timing!' : 'Room for improvement'
                }
              ]
            },
            {
              title: 'Productivity Score',
              stats: [
                {
                  label: 'Task Complexity',
                  value: analyticsData.taskComplexityScore.toFixed(1),
                  detail: 'complexity rating'
                },
                {
                  label: 'Focus Score',
                  value: calculateFocusScore(analyticsData.focusTimeBlocks).toFixed(1),
                  detail: 'minutes per block'
                }
              ]
            }
          ].map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                p-4 sm:p-6 rounded-xl border
                ${theme === 'dark'
                  ? 'bg-slate-800/90 border-slate-700'
                  : 'bg-white border-slate-200'
                }
              `}
            >
              <h3 className={`text-lg font-semibold mb-4
                ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
              `}>
                {section.title}
              </h3>
              <div className="space-y-4">
                {section.stats.map((stat, statIndex) => (
                  <div key={statIndex} className="flex flex-col">
                    <div className="flex justify-between items-baseline">
                      <p className={`text-sm
                        ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
                      `}>
                        {stat.label}
                      </p>
                      <p className={`text-xl font-bold
                        ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
                      `}>
                        {stat.value}
                      </p>
                    </div>
                    <p className={`text-xs mt-1
                      ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}
                    `}>
                      {stat.detail}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
} 

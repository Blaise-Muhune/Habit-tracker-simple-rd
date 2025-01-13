'use client'

import { useTheme } from 'next-themes'
import UserPreferences from '@/components/UserPreferences'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { UserPreferences as UserPreferencesType } from '@/types'


export default function PreferencesPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [defaultView, setDefaultView] = useState<'today' | 'schedule'>('today')
  const [reminderTime, setReminderTime] = useState(10)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return

      try {
        const prefsDoc = await getDoc(doc(db, 'userPreferences', user.uid))
        if (prefsDoc.exists()) {
          const prefs = prefsDoc.data() as UserPreferencesType
          setDefaultView(prefs.defaultView || 'today')
          setReminderTime(prefs.reminderTime || 10)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user])

  // Save preferences
  const savePreferences = async (updates: Partial<UserPreferencesType>) => {
    if (!user) return

    setSaving(true)
    try {
      await updateDoc(doc(db, 'userPreferences', user.uid), updates)
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  // Handle theme toggle
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Handle default view change
  const handleViewChange = async (view: 'today' | 'schedule') => {
    setDefaultView(view)
    await savePreferences({ defaultView: view })
  }

  // Handle reminder time change
  const handleReminderTimeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const time = parseInt(e.target.value)
    setReminderTime(time)
    await savePreferences({ reminderTime: time })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen w-full">
      {/* Mobile-friendly header - Fixed at top */}
      <div className={`sticky top-0 z-10 px-4 py-3 border-b backdrop-blur-lg
        ${theme === 'dark' 
          ? 'bg-slate-900/90 border-slate-700' 
          : 'bg-white/90 border-slate-200'}`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className={`p-2 rounded-lg transition-colors
              ${theme === 'dark' 
                ? 'hover:bg-slate-800' 
                : 'hover:bg-slate-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className={`text-lg font-semibold
            ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            Preferences
          </h1>
        </div>
      </div>

      {/* Main content - Scrollable */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Settings Grid - Responsive layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Notifications Panel - Full width on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`lg:col-span-2 rounded-xl sm:rounded-2xl border
              ${theme === 'dark' 
                ? 'bg-slate-800 border-slate-700' 
                : 'bg-white border-slate-200'}`}
          >
            <div className={`px-4 sm:px-6 py-4 border-b
              ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
            >
              <h2 className={`text-base sm:text-lg font-semibold
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                Notification Settings
              </h2>
              <p className={`mt-1 text-sm
                ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
              >
                Configure your reminder preferences
              </p>
            </div>
            <div className="p-4 sm:p-6">
              <UserPreferences />
            </div>
          </motion.div>

          {/* Quick Settings Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-xl sm:rounded-2xl border
              ${theme === 'dark' 
                ? 'bg-slate-800 border-slate-700' 
                : 'bg-white border-slate-200'}`}
          >
            <div className={`px-4 sm:px-6 py-4 border-b
              ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
            >
              <h2 className={`text-base sm:text-lg font-semibold
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                Quick Settings
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {/* Theme Toggle */}
              <div className={`p-4 rounded-xl
                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}
              >
                <h3 className={`text-sm font-medium mb-3
                  ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                >
                  App Theme
                </h3>
                <div className="flex items-center justify-between">
                  <span className={`text-sm
                    ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
                  >
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-lg transition-colors
                      ${theme === 'dark'
                        ? 'bg-slate-600 hover:bg-slate-500'
                        : 'bg-white hover:bg-slate-100'}`}
                  >
                    {theme === 'dark' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Default View */}
              <div className={`p-4 rounded-xl
                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}
              >
                <h3 className={`text-sm font-medium mb-3
                  ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                >
                  Default View
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleViewChange('today')}
                    disabled={saving}
                    className={`w-full px-4 py-3 rounded-lg text-sm text-left transition-colors
                      ${saving ? 'opacity-50 cursor-not-allowed' : ''}
                      ${defaultView === 'today'
                        ? theme === 'dark'
                          ? 'bg-slate-600'
                          : 'bg-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                  >
                    {saving ? 'Saving...' : 'Today\'s Tasks'}
                  </button>
                  <button
                    onClick={() => handleViewChange('schedule')}
                    className={`w-full px-4 py-3 rounded-lg text-sm text-left transition-colors
                      ${defaultView === 'schedule'
                        ? theme === 'dark'
                          ? 'bg-slate-600'
                          : 'bg-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                  >
                    Full Schedule
                  </button>
                </div>
              </div>

              {/* Reminder Time */}
              <div className={`p-4 rounded-xl
                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}
              >
                <h3 className={`text-sm font-medium mb-3
                  ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                >
                  Default Reminder Time
                </h3>
                <select
                  value={reminderTime}
                  onChange={handleReminderTimeChange}
                  className={`w-full px-4 py-3 rounded-lg text-sm
                    ${theme === 'dark'
                      ? 'bg-slate-600 text-white border-slate-500'
                      : 'bg-white text-gray-900 border-slate-200'}`}
                >
                  <option value="5">5 minutes before</option>
                  <option value="10">10 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                </select>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
} 
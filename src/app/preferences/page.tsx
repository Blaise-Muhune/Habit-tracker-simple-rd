'use client'

import { useTheme } from 'next-themes'
import UserPreferences from '@/components/UserPreferences'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function PreferencesPage() {
  const { theme } = useTheme()

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <div className={`sticky top-0 z-10 px-4 py-3 border-b backdrop-blur-lg
        ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className={`p-2 rounded-lg transition-colors
            ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Preferences
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl sm:rounded-2xl border
            ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
        >
          <div className={`px-4 sm:px-6 py-4 border-b
            ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
          >
            <h2 className={`text-base sm:text-lg font-semibold
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              User Preferences
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <UserPreferences />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
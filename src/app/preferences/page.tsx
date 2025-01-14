'use client'

import { useTheme } from 'next-themes'
import UserPreferences from '@/components/UserPreferences'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function PreferencesPage() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${currentTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight
            ${currentTheme === 'dark'
              ? 'bg-gradient-to-r from-violet-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent'
            }`}
          >
            Preferences
          </h1>
          <Link
            href="/"
            className={`p-2 sm:p-3 rounded-xl transition-all duration-300 border-2
              ${currentTheme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border-2 backdrop-blur-xl
            ${currentTheme === 'dark'
              ? 'bg-slate-800/50 border-slate-700'
              : 'bg-white/50 border-slate-200'
            }`}
        >
          <div className={`mb-6 pb-6 border-b
            ${currentTheme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
          >
            <h2 className={`text-xl font-bold
              ${currentTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}
            >
              User Preferences
            </h2>
            <p className={`mt-1 text-sm
              ${currentTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
            >
              Customize your experience and notification settings
            </p>
          </div>
          
          <div className="space-y-6">
            <UserPreferences />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
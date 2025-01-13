'use client'

import { useTheme } from 'next-themes'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home } from 'lucide-react'

export default function NotFound() {
  const { theme } = useTheme()

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-2xl border-2 backdrop-blur-xl text-center
            ${theme === 'dark'
              ? 'bg-slate-800/50 border-slate-700'
              : 'bg-white/50 border-slate-200'
            }`}
        >
          {/* Error Code */}
          <h1 className={`text-8xl font-bold mb-4
            ${theme === 'dark'
              ? 'bg-gradient-to-r from-violet-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent'
            }`}
          >
            404
          </h1>

          {/* Error Message */}
          <h2 className={`text-2xl font-semibold mb-4
            ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
          >
            Page Not Found
          </h2>
          
          <p className={`text-lg mb-8 max-w-md mx-auto
            ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
          >
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Home Button */}
          <Link
            href="/"
            className={`
              inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold
              transition-all duration-200
              ${theme === 'dark'
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }
            `}
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </motion.div>

        {/* Optional: Illustration or Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <svg
            className={`w-64 h-64 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-200'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M13 14h-2v-4h2m0 8h-2v-2h2M1 21h22L12 2 1 21z"/>
          </svg>
        </motion.div>
      </div>
    </div>
  )
} 
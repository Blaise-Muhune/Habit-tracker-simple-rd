'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/firebase'
import { addDoc, collection } from 'firebase/firestore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function FeedbackPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [feedback, setFeedback] = useState('')
  const [type, setType] = useState('suggestion')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userEmail: user.email,
        type,
        feedback,
        createdAt: new Date().toISOString(),
        status: 'new'
      })
      
      setSubmitted(true)
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight
            ${theme === 'dark'
              ? 'bg-gradient-to-r from-violet-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent'
            }`}
          >
            Send Feedback
          </h1>
          <Link
            href="/"
            className={`p-2 sm:p-3 rounded-xl transition-all duration-300 border-2
              ${theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>

        {/* Main Content */}
        <div className={`p-6 rounded-2xl border-2 backdrop-blur-xl
          ${theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-white/50 border-slate-200'
          }`}
        >
          {/* Description */}
          <div className={`mb-8 pb-6 border-b
            ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
          >
            <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Help us improve your experience by sharing your thoughts.
            </p>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-xl text-center
                ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600'}
              `}
            >
              <p className="text-lg font-medium mb-2">Thank you for your feedback!</p>
              <p className="text-sm">Redirecting you back to the dashboard...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className={`block mb-2 text-sm font-medium
                  ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Feedback Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-violet-500
                    ${theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-slate-50 border-slate-200'
                    }
                  `}
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="other">Other</option>
                </select>
              </motion.div>

              {/* Feedback Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className={`block mb-2 text-sm font-medium
                  ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Your Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={6}
                  required
                  className={`w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-violet-500
                    ${theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-slate-50 border-slate-200'
                    }
                  `}
                  placeholder="Share your thoughts, ideas, or report issues..."
                />
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  type="submit"
                  disabled={isSubmitting || !feedback.trim()}
                  className={`
                    w-full py-4 rounded-xl font-semibold text-white
                    transition-all duration-200
                    ${isSubmitting ? 'cursor-not-allowed opacity-80' : ''}
                    bg-gradient-to-r from-violet-600 to-violet-400
                    hover:from-violet-500 hover:to-violet-300
                    active:from-violet-700 active:to-violet-500
                  `}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </motion.div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const SuccessPage = () => {
  const router = useRouter()
  const { theme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const verifySubscription = async () => {
      if (!user) {
        router.push('/premium')
        return
      }

      try {
        // Check if the session ID exists
        const sessionId = new URLSearchParams(window.location.search).get('session_id')
        if (!sessionId) {
          throw new Error('No session ID found')
        }

        // Check premium status with retries
        let retries = 3
        while (retries > 0) {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          const userData = userDoc.data()

          if (userData?.isPremium) {
            // Status is already set by webhook
            setIsLoading(false)
            return
          }

          // If not set, wait and retry
          await new Promise(resolve => setTimeout(resolve, 2000))
          retries--
        }

        // If still not set after retries, set it manually
        console.log('Setting premium status manually after webhook delay')
        await setDoc(doc(db, 'users', user.uid), {
          isPremium: true,
          premiumStartDate: new Date().toISOString(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        }, { merge: true })

        setIsLoading(false)
      } catch (error) {
        console.error('Error verifying subscription:', error)
        router.push('/premium')
      }
    }

    verifySubscription()
  }, [user, router])

  const handleGoHome = () => {
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F0F4FF]'
    }`}>
      <div className={`max-w-md w-full p-8 rounded-2xl text-center ${
        theme === 'dark' 
          ? 'bg-slate-800/90 border-2 border-violet-500/20' 
          : 'bg-white/90 border-2 border-violet-100'
      }`}>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg 
            className="w-10 h-10 text-green-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className={`text-2xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>
          Welcome to Premium!
        </h1>
        
        <p className={`mb-8 ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
        }`}>
          Your subscription has been successfully activated. Enjoy all the premium features!
        </p>

        <button
          onClick={handleGoHome}
          className={`
            w-full py-4 rounded-xl font-semibold text-white
            transition-all duration-200
            bg-gradient-to-r from-violet-600 to-violet-400
            hover:from-violet-500 hover:to-violet-300
            active:from-violet-700 active:to-violet-500
          `}
        >
          Go to Home
        </button>
      </div>
    </div>
  )
}

export default SuccessPage 
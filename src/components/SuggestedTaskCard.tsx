import { Task, SuggestedTask } from '../types'
import { User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { query, collection, where, getDocs, deleteDoc } from 'firebase/firestore'
import { useState } from 'react'

interface SuggestedTaskCardProps {
  suggestion: SuggestedTask
  theme: string
  onAccept: (task: Partial<Task>) => void
  onRemove: () => void
  user: User | null
}

export default function SuggestedTaskCard({
  suggestion,
  theme,
  onAccept,
  onRemove,
  user,
}: SuggestedTaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const formatTime = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:00 ${ampm}`;
  };

  const deleteFromFirebase = async () => {
    if (!user?.uid) return;
    
    try {
      const suggestionsRef = collection(db, 'suggestions')
      const q = query(
        suggestionsRef,
        where('activity', '==', suggestion.activity),
        where('startTime', '==', suggestion.startTime),
        where('userId', '==', user.uid),
        where('date', '==', new Date().toISOString().split('T')[0])
      )
      const querySnapshot = await getDocs(q)
      
      await Promise.all(
        querySnapshot.docs.map(doc => deleteDoc(doc.ref))
      )
      
      console.log('Suggestion removed from Firebase')
    } catch (error) {
      console.error('Error removing suggestion from Firebase:', error)
    }
  }

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const newTask: Partial<Task> = {
        activity: suggestion.activity,
        startTime: suggestion.startTime,
        duration: suggestion.duration,
        completed: false,
        isPriority: false,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        userId: user?.uid,
        ...(suggestion.description && { description: suggestion.description }),
        ...(suggestion.category && { category: suggestion.category }),
      }

      await deleteFromFirebase()
      onAccept(newTask)
      onRemove()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async () => {
    setIsLoading(true)
    try {
      await deleteFromFirebase()
      onRemove()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`
      p-2.5 rounded-lg border transition-all
      ${theme === 'dark' 
        ? 'bg-slate-800/60 border-slate-700/50'
        : 'bg-white/80 border-slate-200/50'}
    `}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`
            px-2 py-1 rounded-md text-sm whitespace-nowrap
            ${theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'}
          `}>
            {formatTime(suggestion.startTime)}
          </span>
          <h3 className={`font-medium truncate text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {suggestion.activity}
          </h3>
        </div>
        
        <div className="flex gap-1 shrink-0">
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className={`
              p-1.5 rounded-lg transition-colors
              ${theme === 'dark'
                ? 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400'
                : 'bg-violet-50 hover:bg-violet-100 text-violet-600'}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className={`
              p-1.5 rounded-lg transition-colors
              ${theme === 'dark'
                ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
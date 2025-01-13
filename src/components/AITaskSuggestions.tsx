import { Task, SuggestedTask } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from 'date-fns';
import { User } from 'firebase/auth';
import SuggestedTaskCard from './SuggestedTaskCard';

interface AITaskSuggestionsProps {
  theme: string;
  isPremiumUser: boolean;
  isSuggestionsExpanded: boolean;
  setIsSuggestionsExpanded: (value: boolean) => void;
  suggestions: SuggestedTask[];
  isLoadingSuggestions: boolean;
  loadSuggestions: () => void;
  getCurrentTasks: () => Task[];
  setEditingTask: (task: Task | null) => void;
  setShowTaskModal: (show: boolean) => void;
  setCurrentTasks: (tasks: Task[]) => void;
  setSuggestions: React.Dispatch<React.SetStateAction<SuggestedTask[]>>;
  user: User | null;
}

export default function AITaskSuggestions({
    theme,
    isPremiumUser,
    isSuggestionsExpanded,
    setIsSuggestionsExpanded,
    suggestions,
    isLoadingSuggestions,
    loadSuggestions,
    getCurrentTasks,
    setEditingTask,
    setShowTaskModal,
    setCurrentTasks,
    setSuggestions,
    user
  }: AITaskSuggestionsProps) {
    return (
      <div className="w-full mb-4">
        <motion.div
          layout
          className={`
            rounded-xl border overflow-hidden shadow-sm
            ${theme === 'dark'
              ? 'bg-slate-800/90 border-slate-700'
              : 'bg-white/90 border-slate-200'}
            backdrop-blur-sm
          `}
        >
          {/* Header */}
          <button
            onClick={() => isPremiumUser && setIsSuggestionsExpanded(!isSuggestionsExpanded)}
            disabled={!isPremiumUser}
            className={`
              w-full p-3 flex items-center justify-between
              ${isPremiumUser ? 'cursor-pointer hover:bg-slate-50/5' : 'cursor-default'}
              transition-colors
            `}
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                <svg 
                  className={`w-4 h-4 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-500'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <h2 className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  AI Suggestions
                </h2>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {suggestions.length} tasks available
                </p>
              </div>
            </div>

            <svg 
              className={`w-4 h-4 transition-transform duration-200
                ${isSuggestionsExpanded ? 'rotate-180' : ''}
                ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
              `}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
  
          {/* Expanded Content */}
          {isPremiumUser && isSuggestionsExpanded && (
            <AnimatePresence>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-slate-200 dark:border-slate-700"
              >
                {/* Refresh Button Section */}
                <div className={`
                  px-3 py-2 flex justify-between items-center
                  ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50/50'}
                `}>
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                  </span>
                  <button
                    onClick={loadSuggestions}
                    disabled={isLoadingSuggestions}
                    className={`
                      px-2 py-1 rounded-lg transition-colors flex items-center gap-2 text-xs
                      ${theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600'
                      }
                    `}
                  >
                    <svg className={`w-3.5 h-3.5 ${isLoadingSuggestions ? 'animate-spin' : ''}`} 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                    {/* {isLoadingSuggestions ? 'Refreshing...' : 'Refresh'} */}
                  </button>
                </div>
  
                {/* Suggestions List */}
                <div className="p-3 space-y-2">
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <SuggestedTaskCard
                        key={index}
                        suggestion={suggestion}
                        theme={theme}
                        existingTasks={getCurrentTasks()}
                        onAccept={(task: Partial<Task>) => {
                          setEditingTask(task as Task);
                          setShowTaskModal(true);
                        }}
                        onRemove={() => {
                          setSuggestions(prev => prev.filter((_, i) => i !== index));
                        }}
                        user={user}
                        setTomorrowTasks={(tasks: Task[]) => setCurrentTasks(tasks)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        No suggestions available
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    )
  }
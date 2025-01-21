import { Task, SuggestedTask } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { User } from 'firebase/auth';
import SuggestedTaskCard from './SuggestedTaskCard';
import { useState, useEffect } from 'react';

interface AITaskSuggestionsProps {
  theme: string;
  isPremiumUser: boolean;
  isSuggestionsExpanded: boolean;
  day: string;
  setIsSuggestionsExpanded: (value: boolean) => void;
  suggestions: SuggestedTask[];
  isLoadingSuggestions: boolean;
  loadSuggestions: () => void;
  getCurrentTasks: () => Task[];
  setEditingTask: (task: Task | null) => void;
  setShowTaskModal: (show: boolean) => void;
  setCurrentTasks: (tasks: Task[]) => void;
  loadTasks: () => Promise<void>;
  setSuggestions: React.Dispatch<React.SetStateAction<SuggestedTask[]>>;
  user: User | null;
  todayOrTomorrow: string;
}

export default function AITaskSuggestions({
    theme,
    isPremiumUser,
    isSuggestionsExpanded,
    setIsSuggestionsExpanded,
    suggestions,
    isLoadingSuggestions,
    getCurrentTasks,
    setEditingTask,
    setShowTaskModal,
    setSuggestions,
    user,
    day,
    loadTasks,
    todayOrTomorrow
  }: AITaskSuggestionsProps) {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showAllSuggestions, setShowAllSuggestions] = useState(false);
    const INITIAL_SUGGESTIONS_COUNT = 4;

    useEffect(() => {
      let isMounted = true;

      const fetchSuggestions = async () => {
        if (isLoadingSuggestions || suggestions.length > 0) return;
        
        setIsInitialLoading(true);
        try {
          if (!user?.uid || !day || !todayOrTomorrow) {
            console.error('Missing required data for suggestions:', { 
              userId: user?.uid, 
              day, 
              todayOrTomorrow 
            });
            setIsInitialLoading(false);
            return;
          }

          const response = await fetch(process.env.NEXT_PUBLIC_APP_URL+'/api/generate-suggestions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.uid,
              day,
              todayOrTomorrow,
              historicalTasks: getCurrentTasks() || []
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            return;
          }

          const data = await response.json();
          if (isMounted) {
            setSuggestions(data);
          }
        } catch (error) {
          console.error('Failed to load suggestions:', error);
        } finally {
          if (isMounted) {
            setIsInitialLoading(false);
          }
        }
      };

      fetchSuggestions();

      return () => {
        isMounted = false;
      };
    }, [user?.uid, day, todayOrTomorrow, isLoadingSuggestions, suggestions.length]);

    const visibleSuggestions = showAllSuggestions 
      ? suggestions 
      : suggestions.slice(0, INITIAL_SUGGESTIONS_COUNT);

    const handleLoadSuggestions = async () => {
      if (!user?.uid) {
        console.error('No user ID available');
        return;
      }

      try {
        // Debug log to verify data
        console.log('Sending request with user:', user.uid);

        const response = await fetch(process.env.NEXT_PUBLIC_APP_URL+'/api/generate-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            historicalTasks: getCurrentTasks() || [],
            userId: user.uid,
            day: day,
            todayOrTomorrow: todayOrTomorrow
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error:', errorData);
          return;
        }

        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      }
    };

    const handleAcceptTask = async (task: Partial<Task>) => {
      try {
        // Create a new task with the correct date based on todayOrTomorrow
        const taskWithDate = {
          ...task,
          date: day // Use the day prop which contains the correct date string
        };
        
        setEditingTask(taskWithDate as Task);
        setShowTaskModal(true);
        // Reload tasks after modal is closed
        await loadTasks();
      } catch (error) {
        console.error('Error handling task acceptance:', error);
      }
    };

    const handleShowAllSuggestions = async () => {
      if (!showAllSuggestions) {
        setIsLoadingMore(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsLoadingMore(false);
      }
      setShowAllSuggestions(!showAllSuggestions);
    };

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
                  Reload suggestions after ok/x all tasks.
                  </span>
                  <button
                    onClick={handleLoadSuggestions}
                    disabled={isLoadingSuggestions || !user}
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
                  {isInitialLoading ? (
                    // Loading skeleton
                    <div className="space-y-2">
                      {[...Array(3)].map((_, index) => (
                        <div 
                          key={index}
                          className={`
                            p-2.5 rounded-lg border animate-pulse
                            ${theme === 'dark' 
                              ? 'bg-slate-800/60 border-slate-700/50'
                              : 'bg-white/80 border-slate-200/50'}
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`
                              w-16 h-6 rounded-md
                              ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}
                            `}/>
                            <div className={`
                              flex-1 h-6 rounded-md
                              ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}
                            `}/>
                            <div className="flex gap-1">
                              <div className={`
                                w-8 h-8 rounded-lg
                                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}
                              `}/>
                              <div className={`
                                w-8 h-8 rounded-lg
                                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}
                              `}/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : suggestions.length > 0 ? (
                    <>
                      {visibleSuggestions.map((suggestion, index) => (
                        <SuggestedTaskCard
                          key={index}
                          suggestion={suggestion}
                          theme={theme}
                          onAccept={handleAcceptTask}
                          onRemove={() => {
                            setSuggestions(prev => prev.filter((_, i) => i !== index));
                          }}
                          user={user}
                          day={day}
                          todayOrTomorrow={todayOrTomorrow}
                        />
                      ))}
                      
                      {/* View All Button */}
                      {suggestions.length > INITIAL_SUGGESTIONS_COUNT && (
                        <button
                          onClick={handleShowAllSuggestions}
                          disabled={isLoadingMore}
                          className={`
                            w-full py-2 px-3 mt-2 rounded-lg text-sm transition-colors
                            ${theme === 'dark'
                              ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}
                          `}
                        >
                          {isLoadingMore ? (
                            <span className="flex items-center justify-center gap-1">
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                                />
                              </svg>
                              Loading...
                            </span>
                          ) : showAllSuggestions ? (
                            <span className="flex items-center justify-center gap-1">
                              Show Less
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1">
                              View All ({suggestions.length - INITIAL_SUGGESTIONS_COUNT} more)
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      )}
                    </>
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
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, limit } from 'firebase/firestore'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    console.log('Debug: Testing Firebase connectivity...')
    console.log('Debug: Environment check:', {
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    })

    // Test 1: Basic collection access
    console.log('Debug: Testing basic collection access...')
    const tasksRef = collection(db, 'tasks')
    console.log('Debug: Collection reference created')

    // Test 2: Simple query with limit
    console.log('Debug: Testing simple query...')
    const simpleQuery = query(tasksRef, limit(1))
    const simpleSnapshot = await getDocs(simpleQuery)
    console.log('Debug: Simple query executed, found docs:', simpleSnapshot.size)

    // Test 3: User-specific query if userId provided
    let userTasks = 0
    if (userId) {
      console.log('Debug: Testing user-specific query for:', userId)
      try {
        const { where } = await import('firebase/firestore')
        const userQuery = query(tasksRef, where('userId', '==', userId), limit(5))
        const userSnapshot = await getDocs(userQuery)
        userTasks = userSnapshot.size
        console.log('Debug: User query executed, found docs:', userTasks)
      } catch (userQueryError) {
        console.error('Debug: User query failed:', userQueryError)
        return NextResponse.json({
          error: 'User query failed',
          details: userQueryError instanceof Error ? userQueryError.message : 'Unknown error',
          tests: {
            basicConnection: true,
            simpleQuery: true,
            userQuery: false
          }
        }, { status: 500 })
      }
    }

    // Test 4: Check taskSuggestions collection
    console.log('Debug: Testing taskSuggestions collection...')
    const suggestionsRef = collection(db, 'taskSuggestions')
    const suggestionsQuery = query(suggestionsRef, limit(1))
    const suggestionsSnapshot = await getDocs(suggestionsQuery)
    console.log('Debug: TaskSuggestions query executed, found docs:', suggestionsSnapshot.size)

    return NextResponse.json({
      success: true,
      tests: {
        basicConnection: true,
        simpleQuery: true,
        userQuery: userId ? true : 'not tested',
        suggestionsCollection: true
      },
      data: {
        totalTasks: simpleSnapshot.size,
        userTasks: userId ? userTasks : 'not queried',
        totalSuggestions: suggestionsSnapshot.size
      },
      environment: {
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.substring(0, 10) + '...'
      }
    })

  } catch (error) {
    console.error('Debug: Firebase test failed:', error)
    return NextResponse.json(
      { 
        error: 'Firebase connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
} 
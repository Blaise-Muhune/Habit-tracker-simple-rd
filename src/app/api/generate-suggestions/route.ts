import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore'

// Check if API key exists
const key = process.env.OPENAI_API_KEY
if (!key) {
  console.error('OPENAI_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  apiKey: key
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Debug logging
    console.log('Request body:', {
      userId: body.userId,
      day: body.day,
      todayOrTomorrow: body.todayOrTomorrow
    })

    if (!body.userId || !body.day || !body.todayOrTomorrow) {
      console.log('Missing required fields:', { 
        userId: body.userId, 
        day: body.day,
        todayOrTomorrow: body.todayOrTomorrow 
      })
      return NextResponse.json(
        { error: 'userId, day, and todayOrTomorrow are required' },
        { status: 400 }
      )
    }

    // Check Firebase for existing suggestions first - Use consistent collection name
    try {
      const suggestionsRef = collection(db, 'taskSuggestions')
      const suggestionsQuery = query(
        suggestionsRef,
        where('userId', '==', body.userId),
        where('day', '==', body.day.toLowerCase()),
        where('processed', '==', false)
      )
      const suggestionsSnapshot = await getDocs(suggestionsQuery)
      
      if (!suggestionsSnapshot.empty) {
        console.log('Found existing suggestions in Firebase')
        const existingSuggestions = suggestionsSnapshot.docs.map(doc => ({
          activity: doc.data().activity,
          description: doc.data().description || '',
          startTime: doc.data().startTime,
          duration: doc.data().duration,
          completed: false,
          isPriority: false,
          date: body.day,
          createdAt: Date.now(),
          userId: body.userId,
          confidence: doc.data().confidence || 85,
          category: doc.data().category || 'General',
          day: body.day.toLowerCase()
        }))
        return NextResponse.json(existingSuggestions)
      }
    } catch (fbError) {
      console.error('Failed to query Firebase suggestions:', fbError)
    }

    // Fetch historical tasks from Firebase
    try {
      console.log('Attempting to fetch historical tasks for user:', body.userId)
      
      const tasksRef = collection(db, 'tasks')
      console.log('Tasks collection reference created')
      
      const tasksQuery = query(
        tasksRef,
        where('userId', '==', body.userId)
      )
      console.log('Query created for userId:', body.userId)
      
      const tasksSnapshot = await getDocs(tasksQuery)
      console.log('Query executed, docs found:', tasksSnapshot.size)
      
      const historicalTasks = tasksSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }))
      console.log('Historical tasks mapped:', historicalTasks.length)

      // If no historical tasks found, return default suggestions
      if (historicalTasks.length === 0) {
        console.log('No historical tasks found, returning defaults')
        const defaultSuggestions = [
          {
            activity: "Plan Your Day",
            description: "Review goals and prioritize important tasks for productivity",
            startTime: 8,
            duration: 1,
            confidence: 90,
            category: "Planning",
            completed: false,
            isPriority: false,
            date: body.day,
            createdAt: Date.now(),
            userId: body.userId,
            day: body.day.toLowerCase()
          },
          {
            activity: "Learn Something New",
            description: "Dedicate time to skill development and continuous learning",
            startTime: 14,
            duration: 1,
            confidence: 85,
            category: "Learning",
            completed: false,
            isPriority: false,
            date: body.day,
            createdAt: Date.now(),
            userId: body.userId,
            day: body.day.toLowerCase()
          }
        ]

        // Store default suggestions in Firebase
        try {
          const suggestionsRef = collection(db, 'taskSuggestions')
          await Promise.all(defaultSuggestions.map(suggestion => 
            addDoc(suggestionsRef, {
              ...suggestion,
              processed: false
            })
          ))
          console.log('Default suggestions stored in Firebase')
        } catch (fbError) {
          console.error('Failed to store default suggestions:', fbError)
          // Return suggestions anyway, even if storage fails
        }

        return NextResponse.json(defaultSuggestions)
      }

      console.log('Proceeding with OpenAI generation using', historicalTasks.length, 'historical tasks')
      
      // 2. Prepare the prompt - Fixed JSON format
      const prompt = `
        You are a productivity and time management expert. Based on these historical tasks:
        ${JSON.stringify(historicalTasks, null, 2)}

        Generate only 2 suggested tasks for ${body.day} that focus on REPETITIVE and HIGH-PRODUCTIVITY activities. Format your response as a JSON object with this exact structure:
        {
          "suggestions": [
            {
              "activity": "Task name",
              "description": "Brief description",
              "startTime": 14,
              "duration": 1,
              "category": "category name"
            },
            {
              "activity": "Task name 2",
              "description": "Brief description 2", 
              "startTime": 16,
              "duration": 2,
              "category": "category name 2"
            }
          ]
        }

        Rules:
        - PRIORITIZE repetitive tasks that appear frequently in historical data
        - Focus on high-impact productivity activities (learning, planning, skill development, health, organization)
        - Identify patterns in user's routine and suggest similar recurring tasks
        - For repetitive tasks, consider optimal timing based on when user typically performs them
        - Suggest tasks that build momentum and create positive habits
        - If suggesting new productive activities, ensure they align with user's existing patterns
        - activity should be clear and actionable
        - startTime must be between 0 and 23 (24-hour format) and should match user's typical schedule patterns
        - duration must be between 1 and 4 hours
        - descriptions should be under 100 characters and emphasize the productivity benefit
        - base suggestions on patterns from historical tasks, especially recurring ones
        - look at the day of the week and suggest tasks that the user commonly does on that day
        - if user has limited task history, suggest foundational productivity habits (planning, learning, exercise, organization)
        - consider task frequency - prioritize suggesting tasks the user does weekly or daily over one-time tasks
      `

      // 3. Make OpenAI request with error handling
      console.log('Sending request to OpenAI...')
      
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }
      
      const completion = await openai.chat.completions.create({
        messages: [{ 
          role: "user", 
          content: prompt 
        }],
        model: "gpt-4o", // Fallback to 3.5 if 4 isn't available
        response_format: { type: "json_object" },
        temperature: 0.5,
      })

      // 4. Log and validate response
      const responseContent = completion.choices[0].message.content
      console.log('OpenAI response:', responseContent)

      if (!responseContent) {
        throw new Error('Empty response from OpenAI')
      }

      // 5. Parse and validate JSON
      const parsedResponse = JSON.parse(responseContent)
      
      if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
        throw new Error('Invalid response format from OpenAI')
      }

      // Validate each suggestion matches our interface
      const validatedSuggestions = parsedResponse.suggestions.map((suggestion: {
        activity: string;
        description?: string;
        startTime: number;
        duration: number;
        confidence?: number;
        category?: string;
      }) => {
        if (
          typeof suggestion.activity !== 'string' ||
          typeof suggestion.startTime !== 'number' ||
          typeof suggestion.duration !== 'number' ||
          suggestion.startTime < 0 || 
          suggestion.startTime > 23
        ) {
          throw new Error('Invalid suggestion format')
        }

        return {
          activity: suggestion.activity,
          description: suggestion.description || '',
          startTime: suggestion.startTime,
          duration: suggestion.duration,
          completed: false,
          isPriority: false,
          date: body.day,
          createdAt: Date.now(),
          userId: body.userId,
          confidence: suggestion.confidence || 85,
          category: suggestion.category || 'General',
          day: body.day.toLowerCase()
        }
      })

      // Store suggestions in Firebase - Use consistent collection name
      try {
        const suggestionsRef = collection(db, 'taskSuggestions')
        await Promise.all(validatedSuggestions.map((suggestion: {
          activity: string;
          description: string;
          startTime: number;
          duration: number;
          completed: boolean;
          isPriority: boolean;
          date: string;
          createdAt: number;
          userId: string;
          confidence: number;
          category: string;
          day: string;
        }) => 
          addDoc(suggestionsRef, {
            ...suggestion,
            processed: false
          })
        ))
        console.log('Suggestions stored in Firebase')
      } catch (fbError) {
        console.error('Failed to store suggestions in Firebase:', fbError)
        // Continue execution even if Firebase storage fails
      }

      return NextResponse.json(validatedSuggestions)

    } catch (fbError) {
      console.error('Failed to query Firebase tasks:', fbError)
      console.error('Error details:', {
        message: fbError instanceof Error ? fbError.message : 'Unknown Firebase error',
        code: fbError instanceof Error && 'code' in fbError ? fbError.code : 'No code',
        name: fbError instanceof Error ? fbError.name : 'Unknown error name'
      })
      
      // Try to return default suggestions as fallback
      try {
        const defaultSuggestions = [
          {
            activity: "Plan Your Day",
            description: "Review goals and prioritize important tasks for productivity",
            startTime: 9,
            duration: 1,
            confidence: 90,
            category: "Planning",
            completed: false,
            isPriority: false,
            date: body.day,
            createdAt: Date.now(),
            userId: body.userId,
            day: body.day.toLowerCase()
          },
          {
            activity: "Focus Time",
            description: "Dedicated time for deep work and important tasks",
            startTime: 15,
            duration: 2,
            confidence: 85,
            category: "Productivity",
            completed: false,
            isPriority: false,
            date: body.day,
            createdAt: Date.now(),
            userId: body.userId,
            day: body.day.toLowerCase()
          }
        ]
        
        console.log('Returning fallback default suggestions due to Firebase error')
        return NextResponse.json(defaultSuggestions)
      } catch (fallbackError) {
        console.error('Even fallback failed:', fallbackError)
        return NextResponse.json(
          { 
            error: 'Failed to fetch historical tasks and fallback failed',
            details: fbError instanceof Error ? fbError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

  } catch (error: unknown) {
    // 7. Detailed error logging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'Unknown error',
    })

    // 8. Return appropriate error response
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
} 
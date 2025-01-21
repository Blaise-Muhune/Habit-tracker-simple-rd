import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import { SuggestedTask } from '@/types'
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

    // Check Firebase for existing suggestions first
    try {
      const suggestionsRef = collection(db, `suggestions-${body.todayOrTomorrow}`)
      const suggestionsQuery = query(
        suggestionsRef,
        where('userId', '==', body.userId)
      )
      const suggestionsSnapshot = await getDocs(suggestionsQuery)
      
      if (!suggestionsSnapshot.empty) {
        console.log('Found existing suggestions in Firebase')
        const existingSuggestions = suggestionsSnapshot.docs.map(doc => doc.data() as SuggestedTask)
        return NextResponse.json(existingSuggestions)
      }
    } catch (fbError) {
      console.error('Failed to query Firebase suggestions:', fbError)
    }

    // Fetch historical tasks from Firebase
    try {
      const tasksRef = collection(db, `tasks`)
      const tasksQuery = query(
        tasksRef,
        where('userId', '==', body.userId)
      )
      const tasksSnapshot = await getDocs(tasksQuery)
      const historicalTasks = tasksSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }))

      // If no historical tasks found, return default suggestions
      if (historicalTasks.length === 0) {
        console.log('No historical tasks found, returning defaults')
        const defaultSuggestions = [
          {
            activity: "Not enough tasks to generate suggestions",
            description: "at least 5 days of tasks are required to generate suggestions",
            startTime: 8,
            duration: 1,
            confidence: 90,
            category: "Planning",
            completed: false,
            isPriority: false,
            date: body.day,
            createdAt: Date.now(),
            userId: body.userId,
            day: body.day
          }
        ]

        // Store default suggestions in Firebase
        try {
          const suggestionsRef = collection(db, `suggestions-${body.todayOrTomorrow}`)
          await Promise.all(defaultSuggestions.map(suggestion => 
            addDoc(suggestionsRef, suggestion)
          ))
          console.log('Default suggestions stored in Firebase')
        } catch (fbError) {
          console.error('Failed to store default suggestions:', fbError)
        }

        return NextResponse.json(defaultSuggestions)
      }

      console.log('No existing suggestions found, generating new ones with historical tasks...')
      
      // Use the fetched historical tasks for OpenAI generation
      // 2. Prepare the prompt
      const prompt = `
        You are a productivity and time management expert. Based on these historical tasks:
        ${JSON.stringify(historicalTasks, null, 2)}

        Generate only 2 suggested tasks for ${body.day}. Format your response as a JSON object with this exact structure:
        {
          "suggestions-${body.todayOrTomorrow}": [
            {
              "activity": "Task name",
              "description": "Brief description",
              "startTime": number between 0-23,
              "duration": number between 1-4,
              "category": "optional category name"
              "day": "day name"
            }
          ]
        }

        Rules:
        - activity should be clear and actionable
        - startTime must be between 0 and 23 (24-hour format)
        - duration must be between 1 and 4 hours
        - descriptions should be under 100 characters
        - base suggestions on patterns from historical tasks
        - look at the day of the week and suggest tasks accordingly
        - suggest tasks based on trends from historical tasks on that day of the week
        - if user has no tasks or very little tasks, suggest tasks that are not time-sensitive
      `

      // 3. Make OpenAI request with error handling
      console.log('Sending request to OpenAI...')
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
      const validatedSuggestions = parsedResponse.suggestions.map((suggestion: SuggestedTask): SuggestedTask => {
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
          day: body.day
        }
      })

      // Store suggestions in Firebase
      try {
        const suggestionsRef = collection(db, `suggestions-${body.todayOrTomorrow}`)
        await Promise.all(validatedSuggestions.map((suggestion: SuggestedTask) => 
          addDoc(suggestionsRef, suggestion)
        ))
        console.log('Suggestions stored in Firebase')
      } catch (fbError) {
        console.error('Failed to store suggestions in Firebase:', fbError)
        // Continue execution even if Firebase storage fails
      }

      return NextResponse.json(validatedSuggestions)

    } catch (fbError) {
      console.error('Failed to query Firebase tasks:', fbError)
      return NextResponse.json(
        { error: 'Failed to fetch historical tasks' },
        { status: 500 }
      )
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
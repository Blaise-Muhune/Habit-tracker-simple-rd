import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    // Test: Query existing suggestions
    const suggestionsQuery = query(
      collection(db, 'taskSuggestions'),
      where('userId', '==', userId),
      where('processed', '==', false)
    )

    const snapshot = await getDocs(suggestionsQuery)
    const suggestions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Test: Call the generate-suggestions API
    const generateResponse = await fetch(`${request.url.split('/api')[0]}/api/generate-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        day: new Date().toISOString().split('T')[0],
        todayOrTomorrow: 'tomorrow'
      }),
    })

    const generatedSuggestions = generateResponse.ok ? await generateResponse.json() : null

    return NextResponse.json({
      existingSuggestions: suggestions,
      generatedSuggestions,
      generateStatus: generateResponse.status,
      success: true
    })

  } catch (error) {
    console.error('Test suggestions error:', error)
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
} 
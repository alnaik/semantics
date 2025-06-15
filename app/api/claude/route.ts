// app/api/claude/route.ts
import { NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function POST(request: Request) {
  try {
    const { text, existingThoughts = [] } = await request.json();

    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Prepare context about existing thoughts for connection detection
    const thoughtContext = existingThoughts.length > 0 
      ? `\n\nExisting thoughts in the system:\n${existingThoughts.map((t: any, i: number) => 
          `${i + 1}. [ID: ${t.id}] "${t.text}" (tags: ${t.tags?.join(', ') || 'none'})`
        ).join('\n')}`
      : '';

    const prompt = `Analyze this thought and extract semantic meaning.

New thought: "${text}"${thoughtContext}

Please respond with a JSON object containing:
1. "tags": An array of 2-5 semantic tags/concepts (single words or short phrases)
2. "connections": An array of IDs of existing thoughts that are semantically related to this new thought
3. "summary": A one-sentence summary of the core idea

Focus on extracting meaningful concepts, not just keywords. For connections, only include IDs where there's a strong semantic relationship.

Respond ONLY with valid JSON, no additional text.`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: 'Failed to analyze thought' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    try {
      const parsed = JSON.parse(content);
      return NextResponse.json({
        tags: parsed.tags || [],
        connections: parsed.connections || [],
        summary: parsed.summary || ''
      });
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content);
      // Fallback to basic extraction
      return NextResponse.json({
        tags: extractBasicTags(text),
        connections: [],
        summary: text.substring(0, 100)
      });
    }
  } catch (error) {
    console.error('Error in Claude API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

function extractBasicTags(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'where', 'when', 'why', 'how']);
  
  return words
    .filter(word => word.length > 3 && !commonWords.has(word))
    .slice(0, 3)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1));
}
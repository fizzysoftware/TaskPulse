// AI Service - proxied through backend to avoid CORS issues
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GenerateContentResponse {
  text: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
}

// Generate content using Gemini via backend proxy
export const generateContent = async (
  messages: ChatMessage[],
  systemInstruction?: string,
  tools?: any[]
): Promise<GenerateContentResponse> => {
  const response = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      systemInstruction,
      tools,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract text from response
  const candidate = data.candidates?.[0];
  const content = candidate?.content;
  const parts = content?.parts || [];
  
  let text = '';
  let functionCalls: Array<{ name: string; args: Record<string, any> }> = [];

  for (const part of parts) {
    if (part.text) {
      text += part.text;
    }
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args || {}
      });
    }
  }

  return { text, functionCalls: functionCalls.length > 0 ? functionCalls : undefined };
};

// Expand task description using AI
export const expandTaskDescription = async (
  shortTitle: string
): Promise<{ description: string; checklist: string[] } | null> => {
  try {
    const response = await fetch(`${API_URL}/api/ai/expand-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: shortTitle }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Task expansion failed:', error);
    return null;
  }
};

// Analyze team productivity
export const analyzeTeamProductivity = async (tasks: any[]): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/api/ai/analyze-productivity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tasks }),
    });

    if (!response.ok) {
      return 'Unable to generate analysis.';
    }

    const data = await response.json();
    return data.summary || 'Keep up the good work!';
  } catch (error) {
    console.error('Productivity analysis failed:', error);
    return 'Unable to generate analysis.';
  }
};

export default {
  generateContent,
  expandTaskDescription,
  analyzeTeamProductivity,
};

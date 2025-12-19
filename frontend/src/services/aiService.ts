// AI Service using Emergent Integration Proxy
const EMERGENT_PROXY_URL = 'https://integrations.emergentagent.com/api/providers/google/v1beta';

// Get API key from environment
const getApiKey = (): string => {
  return process.env.API_KEY || process.env.GEMINI_API_KEY || '';
};

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

// Generate content using Gemini via Emergent proxy
export const generateContent = async (
  messages: ChatMessage[],
  systemInstruction?: string,
  tools?: any[]
): Promise<GenerateContentResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured');
  }

  const requestBody: any = {
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
  }

  const response = await fetch(
    `${EMERGENT_PROXY_URL}/models/gemini-2.0-flash:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
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

// Simple text generation without tools
export const generateSimpleText = async (prompt: string): Promise<string> => {
  const result = await generateContent([
    { role: 'user', parts: [{ text: prompt }] }
  ]);
  return result.text;
};

// Expand task description using AI
export const expandTaskDescription = async (
  shortTitle: string
): Promise<{ description: string; checklist: string[] } | null> => {
  try {
    const prompt = `Create a detailed task description and a checklist of 3-5 subtasks for a small business task titled: "${shortTitle}". 
    Keep it professional and concise.
    
    Return your response in this exact JSON format:
    {
      "description": "A clear, actionable description of the task",
      "checklist": ["Step 1", "Step 2", "Step 3"]
    }`;

    const result = await generateContent([
      { role: 'user', parts: [{ text: prompt }] }
    ]);

    // Parse JSON from response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Task expansion failed:', error);
    return null;
  }
};

// Analyze team productivity
export const analyzeTeamProductivity = async (tasks: any[]): Promise<string> => {
  try {
    const taskSummary = tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority
    }));

    const prompt = `Analyze this list of tasks and provide a 2-sentence motivational summary for the manager about the team's current workload and progress. Keep it positive and actionable.
    
    Tasks: ${JSON.stringify(taskSummary)}`;

    const result = await generateContent([
      { role: 'user', parts: [{ text: prompt }] }
    ]);

    return result.text || 'Keep up the good work!';
  } catch (error) {
    console.error('Productivity analysis failed:', error);
    return 'Unable to generate analysis.';
  }
};

export default {
  generateContent,
  generateSimpleText,
  expandTaskDescription,
  analyzeTeamProductivity,
};

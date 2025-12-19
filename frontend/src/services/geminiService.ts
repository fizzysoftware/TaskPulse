import { GoogleGenAI, Type } from "@google/genai";

// Get API key from environment
const getApiKey = () => {
  return process.env.API_KEY || process.env.GEMINI_API_KEY || '';
};

// Create a detailed task description and checklist using Gemini
export const expandTaskDescription = async (shortTitle: string): Promise<{ description: string; checklist: string[] } | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("No Gemini API key configured");
    return null;
  }

  const ai = new GoogleGenAI({ 
    apiKey,
    baseUrl: 'https://integrations.emergentagent.com/api/providers/google/v1beta'
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Create a detailed task description and a checklist of 3-5 subtasks for a small business task titled: "${shortTitle}". Keep it professional and concise. Return JSON with "description" (string) and "checklist" (array of strings).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A clear, actionable description of the task." },
            checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 3-5 sub-steps to complete the task."
            }
          },
          required: ["description", "checklist"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini expansion failed:", error);
    return null;
  }
};

// Generate a motivational summary of team productivity using Gemini
export const analyzeTeamProductivity = async (tasks: any[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "AI analysis requires API key configuration.";
  }

  const ai = new GoogleGenAI({ 
    apiKey,
    baseUrl: 'https://integrations.emergentagent.com/api/providers/google/v1beta'
  });

  const taskSummary = tasks.map(t => ({
    title: t.title,
    status: t.status,
    priority: t.priority
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analyze this list of tasks and provide a 2-sentence motivational summary for the manager about the team's current workload and progress. Data: ${JSON.stringify(taskSummary)}`,
    });
    return response.text || "Keep up the good work!";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Unable to generate analysis.";
  }
};

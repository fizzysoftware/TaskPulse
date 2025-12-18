
import { GoogleGenAI, Type } from "@google/genai";

// Create a detailed task description and checklist using Gemini
export const expandTaskDescription = async (shortTitle: string): Promise<{ description: string; checklist: string[] } | null> => {
  // Always initialize right before use as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      // Use gemini-3-flash-preview for basic text tasks
      model: "gemini-3-flash-preview",
      contents: `Create a detailed task description and a checklist of 3-5 subtasks for a small business task titled: "${shortTitle}". Keep it professional and concise.`,
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
    // Always initialize right before use as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const taskSummary = tasks.map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority
    }));

    try {
        const response = await ai.models.generateContent({
            // Use gemini-3-flash-preview for basic text tasks
            model: "gemini-3-flash-preview",
            contents: `Analyze this list of tasks and provide a 2-sentence motivational summary for the manager about the team's current workload and progress. Data: ${JSON.stringify(taskSummary)}`,
        });
        // Access .text property directly
        return response.text || "Keep up the good work!";
    } catch (error) {
        return "Unable to generate analysis.";
    }
}

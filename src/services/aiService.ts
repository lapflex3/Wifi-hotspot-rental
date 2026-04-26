import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getAIHelp(prompt: string, context?: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `System Context: You are an AI Hotspot Assistant for HS-Manager. 
          The current application status is: ${JSON.stringify(context || {})}.
          User Question: ${prompt}` }]
        }
      ],
      config: {
        systemInstruction: "You are a professional, helpful technical support AI for HS-Manager. Use concise, technical but clear language. Your goal is to help both users (with connection issues) and admins (with configuration and monitoring).",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Service Error:", error);
    return "I'm sorry, I'm currently experiencing some technical difficulties. Please try again later or contact admin directly.";
  }
}

export async function getAdminConfigAI(instruction: string, currentSettings: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `Current Settings: ${JSON.stringify(currentSettings)}. 
          Admin Instruction: ${instruction}. 
          Provide a JSON response with suggested updates to 'broadcastMessage', 'allowedApps', 'popupSSID', or 'popupGatewayIP'.` }]
        }
      ],
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the core configuration engine for HS-Manager. Based on admin instructions, suggest optimal values for the system settings. Return only valid JSON. If the instructions relate to network triggers, update 'popupSSID' or 'popupGatewayIP'. If they relate to app access, update 'allowedApps'."
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Admin AI Error:", error);
    return null;
  }
}

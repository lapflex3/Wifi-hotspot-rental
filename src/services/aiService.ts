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

export async function getSystemAnalysis(query: string, context: { sessions: any[], requests: any[], settings: any, packages: any[] }) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `
          System Context:
          - Active Sessions: ${JSON.stringify(context.sessions)}
          - Pending Requests: ${JSON.stringify(context.requests.filter(r => r.status === 'pending'))}
          - System Settings: ${JSON.stringify(context.settings)}
          - Available Packages: ${JSON.stringify(context.packages)}
          
          Admin Query: ${query}
          
          If the admin asks to change settings (allow apps, block apps, change SSID, broadcast msg, etc.), 
          include an 'updates' object in your JSON response.
          
          Response format: 
          {
            "text": "Your natural language response here",
            "updates": {
              "allowedApps": ["app1", "app2"], // include the full updated list if changed
              "broadcastMessage": "...",
              "popupSSID": "...",
              "popupGatewayIP": "..."
            }
          }
          ` }]
        }
      ],
      config: {
        systemInstruction: "You are the Senior Network Architect. You MUST return a valid JSON object with 'text' and optionally 'updates'. Be technical and helpful.",
        responseMimeType: "application/json"
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      return { text: response.text };
    }
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { text: "Maaf, sistem AI sedang mengalami gangguan." };
  }
}

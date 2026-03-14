import { GoogleGenAI, Type } from "@google/genai";
import { ScannedImage, OptimizationSuggestion } from "../types";

export const analyzeImagesWithGemini = async (images: ScannedImage[]): Promise<OptimizationSuggestion[]> => {
  if (images.length === 0) return [];

  const imagesContext = images.map(img => ({
    id: img.id,
    src: img.src,
    width: img.originalWidth,
    height: img.originalHeight,
    class: img.className,
    alt: img.alt,
    parentContext: img.contextSnippet
  }));

  const systemInstruction = `
    You are a Web Performance and Accessibility Expert. 
    Analyze the provided list of images extracted from a website's HTML.
    For each image, determine its likely role based on its class names, dimensions, and context.
    
    Provide specific optimization recommendations:
    1. Role: What is this image? (Hero, Icon, Avatar, Gallery, Content)
    2. Suggested Formats: Modern formats like WebP or AVIF.
    3. Suggested Widths: An array of pixel widths suitable for a responsive 'srcset'.
    4. Sizes Attribute: A recommended 'sizes' attribute string for responsive behavior.
    5. Lazy Load: Boolean, true if it should be lazy loaded, false if it's likely above-the-fold (like a Hero).
    6. Alt Text: If the current alt text is missing or poor, suggest an improvement based on the context (or note if it's decorative).
    7. Reasoning: A brief explanation of why you chose these settings.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: JSON.stringify(imagesContext),
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              imageId: { type: Type.STRING },
              role: { type: Type.STRING },
              suggestedFormats: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              suggestedWidths: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER } 
              },
              sizesAttribute: { type: Type.STRING },
              lazyLoad: { type: Type.BOOLEAN },
              altTextImprovement: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["imageId", "role", "suggestedFormats", "suggestedWidths", "sizesAttribute", "lazyLoad", "reasoning"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};

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

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images: imagesContext }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Rethrow to let the UI handle the error (e.g., showing the rate limit message)
    throw error;
  }
};
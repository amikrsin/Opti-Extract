export interface ScannedImage {
  id: string;
  src: string;
  originalWidth: string | null;
  originalHeight: string | null;
  alt: string | null;
  className: string | null;
  contextSnippet: string; // The parent HTML structure for AI context
}

export interface OptimizationSuggestion {
  imageId: string;
  role: string; // e.g., "Hero", "Icon", "Content", "Thumbnail"
  suggestedFormats: string[]; // e.g., ["webp", "avif"]
  suggestedWidths: number[]; // e.g., [640, 1024, 1920]
  sizesAttribute: string; // e.g., "(max-width: 768px) 100vw, 50vw"
  lazyLoad: boolean;
  altTextImprovement?: string;
  reasoning: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  ANALYZING_AI = 'ANALYZING_AI',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
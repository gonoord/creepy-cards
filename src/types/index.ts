export interface CreepyCard {
  id: string;
  phrase: string;
  imageUrl: string;
  isAIGenerated?: boolean;
  aiHint?: string; // For placeholder images
  imageGenerated?: boolean; // True if AI image generation was attempted/successful
}

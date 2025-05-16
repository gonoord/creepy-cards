export interface CreepyCard {
  id: string;
  phrase: string;
  imageUrl: string;
  isAIGenerated?: boolean;
  aiHint?: string; // For placeholder images
}


import type { CreepyCard } from '@/types';
import { generateCreepyImage } from '@/ai/flows/generate-creepy-image';

const basePhrases = [
  "Static",
  "Doll",
  "Mirror",
  "Whisper",
  "Footsteps",
  "Clock",
  "Shadow",
  "Key",
  "Silence",
  "Portrait",
  "Cold spot",
  "Music box",
  "Scratching",
  "Empty swing",
  "Reflection",
  "Unknown call",
  "Scarecrow",
  "Basement",
  "Attic",
  "Locked door"
];

const imageHints = [
  "eerie forest", "ghostly figure", "haunted mansion", "creepy doll", "dark silhouette",
  "monster shadow", "abstract horror", "spooky landscape", "ominous object", "spectral face",
  "abandoned room", "creepy corridor", "glowing eyes", "mysterious door", "twisted tree",
  "old photograph", "dusty artifact", "antique toy", "dark cellar", "hidden passage"
];

const TOTAL_INITIAL_CARDS = 80;
const UPFRONT_GENERATION_COUNT = 3; // Generates 3 images upfront

// Fisher-Yates shuffle function
function shuffleArray<T>(array: T[]): T[] {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
}

export async function generateInitialCards(): Promise<CreepyCard[]> {
  const cards: CreepyCard[] = [];
  const goosebumpsStyleSuffix = ", in the vibrant, colorful, and spooky art style reminiscent of classic Goosebumps book covers.";
  
  const phrases = shuffleArray(basePhrases); // Shuffle the phrases

  for (let i = 0; i < TOTAL_INITIAL_CARDS; i++) {
    const phrase = phrases[i % phrases.length];
    const cardId = `initial-${i + 1}`;
    const placeholderImageUrl = `https://placehold.co/600x400.png`;
    const placeholderAiHint = phrase.split(" ").length <= 2 ? phrase.toLowerCase() : imageHints[i % imageHints.length];


    if (i < UPFRONT_GENERATION_COUNT) {
      try {
        const imageResult = await generateCreepyImage({ prompt: phrase + goosebumpsStyleSuffix });
        cards.push({
          id: cardId,
          phrase: phrase,
          imageUrl: imageResult.imageDataUri,
          isAIGenerated: true,
          imageGenerated: true, 
        });
      } catch (error) {
        console.error(`Failed to generate initial image for card "${phrase}":`, error);
        cards.push({
          id: cardId,
          phrase: phrase,
          imageUrl: placeholderImageUrl,
          isAIGenerated: false,
          imageGenerated: true, // Mark as true even on failure to avoid retry for initial load
          aiHint: placeholderAiHint
        });
      }
    } else {
      cards.push({
        id: cardId,
        phrase: phrase,
        imageUrl: placeholderImageUrl,
        isAIGenerated: false, 
        imageGenerated: false, 
        aiHint: placeholderAiHint
      });
    }
  }
  return cards;
}

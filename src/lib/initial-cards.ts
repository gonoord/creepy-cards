import type { CreepyCard } from '@/types';

const phrases = [
  "The shadows in the corner began to dance.",
  "A faint whisper echoed from the empty room.",
  "The old doll's eyes seemed to follow you.",
  "It was not the wind rattling the windows.",
  "The reflection in the mirror wasn't smiling.",
  "Footsteps creaked on the stairs above, but no one was home.",
  "The phone rang, displaying 'Unknown Caller' from inside the house.",
  "A child's laughter came from the boarded-up attic.",
  "The scarecrow in the field moved at dusk.",
  "Written in dust on the table: 'I'm watching you.'",
  "The portrait's eyes shifted as you walked by.",
  "A cold spot lingered in the warmest part of the room.",
  "The old music box played a song you'd never heard.",
  "Something scratched from inside the walls.",
  "The path into the woods vanished behind you.",
];

const imageHints = [
  "eerie forest", "ghostly figure", "haunted mansion", "creepy doll", "dark silhouette",
  "monster shadow", "abstract horror", "spooky landscape", "ominous object", "spectral face",
  "abandoned room", "creepy corridor", "glowing eyes", "mysterious door", "twisted tree"
];

export function generateInitialCards(): CreepyCard[] {
  const cards: CreepyCard[] = [];
  for (let i = 0; i < 80; i++) {
    cards.push({
      id: `initial-${i + 1}`,
      phrase: phrases[i % phrases.length],
      imageUrl: `https://placehold.co/600x400.png`, // Standard placeholder size
      isAIGenerated: false,
      aiHint: imageHints[i % imageHints.length]
    });
  }
  return cards;
}


"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CreepyCard } from '@/types';
import { generateInitialCards } from '@/lib/initial-cards';
import CreepyCardDisplay from '@/components/creepy-card';
import AddCardModal from '@/components/add-card-modal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, HomeIcon, Ghost } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";
import { generateCreepyImage } from '@/ai/flows/generate-creepy-image'; // For batch generation

// Helper to check if running in browser
const isBrowser = typeof window !== 'undefined';

export default function HomePage() {
  const [cards, setCards] = useState<CreepyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [isLoadingInitialCards, setIsLoadingInitialCards] = useState(true);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const { toast } = useToast();

  // Load initial and custom cards
  useEffect(() => {
    const loadCards = async () => {
      setIsLoadingInitialCards(true);
      toast({
        title: "Summoning First Horrors...",
        description: "Generating images for the first few cards. More will materialize as you delve deeper.",
      });
      
      const initialGeneratedCards = await generateInitialCards();
      
      let userCards: CreepyCard[] = [];
      if (isBrowser) {
        const storedUserCards = localStorage.getItem('creepyUserCards');
        if (storedUserCards) {
          try {
            // Ensure loaded cards have imageGenerated flag, default to true for user cards
            const parsedUserCards = JSON.parse(storedUserCards) as CreepyCard[];
            userCards = parsedUserCards.map(card => ({...card, imageGenerated: card.imageGenerated ?? true }));
          } catch (e) {
            console.error("Failed to parse user cards from localStorage", e);
            localStorage.removeItem('creepyUserCards'); 
          }
        }
      }
      setCards([...initialGeneratedCards, ...userCards]);
      setIsLoadingInitialCards(false);
      if (initialGeneratedCards.length > 0) {
        toast({
          title: "The First Visions Are Ready",
          description: "Initial creepy cards have been summoned. More will appear as you explore.",
        });
      } else {
         toast({
          title: "A Quiet Start",
          description: "No initial cards were generated. Feel free to create your own!",
          variant: "destructive",
        });
      }
    };

    loadCards();
  }, [toast]);

  // Save custom cards to localStorage
  useEffect(() => {
    if (isBrowser && !isLoadingInitialCards) { 
      const userCardsToSave = cards.filter(card => card.isAIGenerated && !card.id.startsWith('initial-'));
      localStorage.setItem('creepyUserCards', JSON.stringify(userCardsToSave));
    }
  }, [cards, isLoadingInitialCards]);

  // Effect for batch image generation
  useEffect(() => {
    const generateNextBatchIfNeeded = async () => {
      if (isLoadingInitialCards || isGeneratingBatch || !cards.length) return;

      const lookAheadDistance = 3; // How many cards ahead to check for needing generation
      let needsGeneration = false;
      let firstCardNeedingGenerationIndex = -1;

      for (let i = 0; i <= lookAheadDistance; i++) {
        const checkIndex = currentIndex + i;
        if (checkIndex < cards.length) {
          const cardToCheck = cards[checkIndex];
          if (cardToCheck && !cardToCheck.imageGenerated && cardToCheck.imageUrl.startsWith('https://placehold.co')) {
            needsGeneration = true;
            // Find the *actual* first card in the whole deck that needs generation for batch start
            firstCardNeedingGenerationIndex = cards.findIndex(c => !c.imageGenerated && c.imageUrl.startsWith('https://placehold.co'));
            break;
          }
        }
      }

      if (needsGeneration && firstCardNeedingGenerationIndex !== -1) {
        setIsGeneratingBatch(true);
        toast({
          title: "Summoning More Horrors...",
          description: `Generating images for the next batch, starting with card #${firstCardNeedingGenerationIndex + 1}.`,
        });

        const batchSize = 3; // Changed batch size from 5 to 3
        const updatedCards = [...cards];
        let generatedCount = 0;

        for (let i = 0; i < batchSize; i++) {
          const cardIndexToProcess = firstCardNeedingGenerationIndex + i;
          if (cardIndexToProcess >= updatedCards.length) break;

          const card = updatedCards[cardIndexToProcess];
          // Double check it still needs generation, in case of overlapping calls (though isGeneratingBatch should prevent)
          if (card && !card.imageGenerated && card.imageUrl.startsWith('https://placehold.co')) {
            try {
              const imageResult = await generateCreepyImage({ prompt: card.phrase });
              updatedCards[cardIndexToProcess] = {
                ...card,
                imageUrl: imageResult.imageDataUri,
                isAIGenerated: true,
                imageGenerated: true,
              };
              generatedCount++;
            } catch (error) {
              console.error(`Failed to generate image for card "${card.phrase}" in batch:`, error);
              // Mark as attempted (imageGenerated: true) even if failed, to prevent retrying this specific card indefinitely.
              // It will keep its placeholder.
              updatedCards[cardIndexToProcess] = { ...card, imageGenerated: true };
            }
          }
        }
        
        setCards(updatedCards);
        setIsGeneratingBatch(false);
        if (generatedCount > 0) {
          toast({
            title: "More Entities Have Manifested",
            description: `${generatedCount} new card images materialized.`,
          });
        } else if (firstCardNeedingGenerationIndex !== -1) { // If we tried to generate but nothing new came
           toast({
            title: "The Veil Remains Thin",
            description: `Attempted to summon more images, but the spirits are quiet for now.`,
            variant: "default"
          });
        }
      }
    };

    generateNextBatchIfNeeded();
  }, [currentIndex, cards, isLoadingInitialCards, isGeneratingBatch, toast]);


  const triggerAnimation = () => {
    setAnimationKey(prevKey => prevKey + 1);
  };

  const handleNext = useCallback(() => {
    if (cards.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
    triggerAnimation();
  }, [cards.length]);

  const handlePrev = useCallback(() => {
    if (cards.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
    triggerAnimation();
  }, [cards.length]);

  const handleGoToStart = useCallback(() => {
    if (cards.length === 0) return;
    setCurrentIndex(0);
    triggerAnimation();
  }, [cards.length]);

  const handleAddCard = useCallback((newCardData: Omit<CreepyCard, 'id' | 'imageGenerated'>) => {
    const newCard: CreepyCard = {
      ...newCardData,
      id: uuidv4(),
      imageGenerated: true, // User-added cards have their images generated immediately
    };
    setCards((prevCards) => {
      const updatedCards = [...prevCards, newCard];
      setCurrentIndex(updatedCards.length - 1); // Navigate to the new card
      return updatedCards;
    });
    triggerAnimation();
  }, []);


  if (isLoadingInitialCards && cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
        <Ghost className="w-16 h-16 text-primary mb-4 animate-pulse" />
        <p className="text-xl">Conjuring initial deck... This may take a while as the first images are generated.</p>
      </div>
    );
  }
  
  if (cards.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
        <Ghost className="w-16 h-16 text-primary mb-4" />
        <p className="text-xl mb-4">The void is empty... for now.</p>
        <AddCardModal onAddCard={handleAddCard} />
      </div>
    );
  }
  
  const currentCard = cards[currentIndex] || null;

  return (
    <div className="flex flex-col items-center min-h-screen bg-background p-4 sm:p-8 selection:bg-accent selection:text-accent-foreground">
      <header className="w-full max-w-md mb-8 text-center">
        <h1 className="text-5xl font-bold text-primary flex items-center justify-center">
          <Ghost className="w-12 h-12 mr-3 text-primary animate-bounce"/>
          Creepy Cards
        </h1>
        <p className="text-muted-foreground mt-2">Unleash your darkest narratives.</p>
      </header>

      <main className="flex flex-col items-center w-full">
        <div className="w-full max-w-md mb-8 h-[550px] flex items-center justify-center">
          <CreepyCardDisplay key={animationKey} card={currentCard} className="h-full" />
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
          <Button onClick={handlePrev} variant="secondary" className="text-lg py-6">
            <ArrowLeft className="h-6 w-6" /> Previous
          </Button>
          <Button onClick={handleGoToStart} variant="secondary" className="text-lg py-6">
            <HomeIcon className="h-6 w-6" /> Start
          </Button>
          <Button onClick={handleNext} variant="secondary" className="text-lg py-6">
            <ArrowRight className="h-6 w-6" /> Next
          </Button>
        </div>
        
        <div className="w-full max-w-md flex justify-center">
            <AddCardModal onAddCard={handleAddCard} />
        </div>
      </main>

      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Creepy Cards. All rights reserved... or are they?</p>
      </footer>
    </div>
  );
}


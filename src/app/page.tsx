
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CreepyCard } from '@/types';
import { generateInitialCards } from '@/lib/initial-cards';
import CreepyCardDisplay from '@/components/creepy-card';
import AddCardModal from '@/components/add-card-modal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, HomeIcon, Ghost, Shuffle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";
import { generateCreepyImage } from '@/ai/flows/generate-creepy-image';

const isBrowser = typeof window !== 'undefined';

const loadingMessages = [
  "Conjuring new spirits...",
  "Stirring the cauldron of chaos...",
  "Consulting otherworldly entities for fresh frights...",
  "Polishing the crypt door handles... again...",
  "Waking a new batch of bats...",
  "Ensuring the fresh ghosts are properly chained...",
  "Recalibrating the creep-o-meter for a new session...",
  "Summoning original nightmares, please stand by...",
  "Dusting off even more ancient grimoires...",
  "Drawing brand new eerie sigils...",
];

export default function HomePage() {
  const [cards, setCards] = useState<CreepyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [isLoadingInitialCards, setIsLoadingInitialCards] = useState(true);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoadingInitialCards && cards.length === 0) {
      const intervalId = setInterval(() => {
        setCurrentLoadingMessage(prevMessage => {
          const currentIndexVal = loadingMessages.indexOf(prevMessage);
          const nextIndex = (currentIndexVal + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 5000); // Cycle messages every 5 seconds
      return () => clearInterval(intervalId);
    }
  }, [isLoadingInitialCards, cards.length]);

  const loadCoreCards = useCallback(async (isShuffle = false) => {
    // Removed toast for starting generation here, handled by generateNextBatchIfNeeded
    
    const initialGeneratedCards = await generateInitialCards();
    
    let userCards: CreepyCard[] = [];
    if (isBrowser && !isShuffle) {
        const storedUserCards = localStorage.getItem('creepyUserCards');
        if (storedUserCards) {
          try {
            const parsedUserCards = JSON.parse(storedUserCards) as CreepyCard[];
            userCards = parsedUserCards.map(card => ({...card, imageGenerated: card.imageGenerated ?? true }));
          } catch (e) {
            console.error("Failed to parse user cards from localStorage", e);
            localStorage.removeItem('creepyUserCards'); 
          }
        }
      }
    
    setCards(isShuffle ? initialGeneratedCards : [...initialGeneratedCards, ...userCards]);
    setIsLoadingInitialCards(false);
    setCurrentIndex(0);
    setAnimationKey(prevKey => prevKey + 1);

    if (initialGeneratedCards.length > 0 && !isShuffle) { // Only show initial ready toast if not shuffling and cards were generated
       toast({
        title: "The First Visions Are Ready",
        description: "Initial creepy cards have been summoned. More will appear as you explore.",
      });
    } else if (isShuffle && initialGeneratedCards.length > 0) {
        toast({
            title: "Deck Reshuffled!",
            description: "A fresh set of nightmares awaits.",
        });
    } else if (initialGeneratedCards.length === 0) {
       toast({
        title: isShuffle ? "Shuffle Anomaly" : "A Quiet Start",
        description: isShuffle ? "The deck vanished! Try creating cards or shuffling again." : "No initial cards were generated. Feel free to create your own!",
        variant: "destructive",
      });
    }
  }, [toast]);


  useEffect(() => {
    setIsLoadingInitialCards(true);
    loadCoreCards(false);
  }, [loadCoreCards]);


  useEffect(() => {
    if (isBrowser && !isLoadingInitialCards) { 
      const userCardsToSave = cards.filter(card => card.isAIGenerated && !card.id.startsWith('initial-'));
      localStorage.setItem('creepyUserCards', JSON.stringify(userCardsToSave));
    }
  }, [cards, isLoadingInitialCards]);

  useEffect(() => {
    const generateNextBatchIfNeeded = async () => {
      if (isLoadingInitialCards || isGeneratingBatch || !cards.length) return;

      const lookAheadDistance = 3; 
      let needsGeneration = false;
      let firstCardNeedingGenerationIndex = -1;

      for (let i = 0; i <= lookAheadDistance; i++) {
        const checkIndex = currentIndex + i;
        if (checkIndex < cards.length) {
          const cardToCheck = cards[checkIndex];
          if (cardToCheck && !cardToCheck.imageGenerated && cardToCheck.imageUrl.startsWith('https://placehold.co')) {
            needsGeneration = true;
            firstCardNeedingGenerationIndex = cards.findIndex(c => c && !c.imageGenerated && c.imageUrl.startsWith('https://placehold.co'));
            break;
          }
        }
      }

      if (needsGeneration && firstCardNeedingGenerationIndex !== -1) {
        setIsGeneratingBatch(true);
        try {
          const batchSize = 3; 
          const updatedCards = [...cards];
          let generatedCount = 0;

          for (let i = 0; i < batchSize; i++) {
            const cardIndexToProcess = firstCardNeedingGenerationIndex + i;
            if (cardIndexToProcess >= updatedCards.length) break;

            const card = updatedCards[cardIndexToProcess];
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
                // Mark as generated even on failure to prevent retrying indefinitely for a consistently failing image
                updatedCards[cardIndexToProcess] = { ...card, imageGenerated: true }; 
              }
            }
          }
          
          setCards(updatedCards);

          if (generatedCount > 0) {
            toast({
              title: "More Entities Have Manifested",
              description: `${generatedCount} new card images materialized.`,
            });
          } else if (firstCardNeedingGenerationIndex !== -1) { 
             toast({
              title: "The Veil Remains Thin",
              description: `Attempted to summon more images, but the spirits are quiet for now.`,
              variant: "default"
            });
          }
        } catch (e) {
          console.error("Unexpected error during batch image generation:", e);
          toast({
            title: "Spiritual Interference",
            description: "An unexpected issue occurred while conjuring images. Please try again later.",
            variant: "destructive",
          });
        } finally {
          setIsGeneratingBatch(false);
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
      imageGenerated: true, 
    };
    setCards((prevCards) => {
      const updatedCards = [...prevCards, newCard];
      if (updatedCards.length === 1) {
        setCurrentIndex(0);
      } else {
        setCurrentIndex(updatedCards.length - 1); // Go to the newly added card
      }
      return updatedCards;
    });
    triggerAnimation();
  }, []);

  const handleShuffle = useCallback(async () => {
    setIsLoadingInitialCards(true);
    setCurrentLoadingMessage(loadingMessages[0]); 
    setCards([]); 
    setCurrentIndex(0);

    if (isBrowser) {
      localStorage.removeItem('creepyUserCards');
    }

    toast({
      title: "Reshuffling the Horrors...",
      description: "A new deck of creepy cards is materializing.",
    });
    
    await loadCoreCards(true);

  }, [toast, loadCoreCards]);


  if (isLoadingInitialCards || (cards.length === 0 && !isGeneratingBatch)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
        <Ghost className="w-20 h-20 text-primary mb-6 float-ghost" />
        <p className="text-2xl font-semibold mb-2">Please Wait...</p>
        <p className="text-lg text-muted-foreground text-center max-w-md">
          {currentLoadingMessage}
        </p>
      </div>
    );
  }
  
  if (cards.length === 0 && !isLoadingInitialCards) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
        <Ghost className="w-16 h-16 text-primary mb-4" />
        <p className="text-xl mb-4">The void is empty... for now.</p>
        <div className="flex gap-4">
            <AddCardModal onAddCard={handleAddCard} />
            <Button onClick={handleShuffle} variant="outline" disabled={isLoadingInitialCards || isGeneratingBatch}>
                <Shuffle className="mr-2 h-4 w-4" /> Shuffle Deck
            </Button>
        </div>
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
          {currentCard ? (
            <CreepyCardDisplay key={animationKey} card={currentCard} className="h-full" />
          ) : (
            <div className="w-full max-w-md h-[550px] flex items-center justify-center bg-card rounded-lg shadow-xl p-4">
                 <p className="text-muted-foreground">Loading card...</p>
            </div>
           )
          }
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
          <Button onClick={handlePrev} variant="secondary" className="text-lg py-6" disabled={isLoadingInitialCards || isGeneratingBatch}>
            <ArrowLeft className="h-6 w-6 mr-2" /> Previous
          </Button>
          <Button onClick={handleGoToStart} variant="secondary" className="text-lg py-6" disabled={isLoadingInitialCards || isGeneratingBatch}>
            <HomeIcon className="h-6 w-6 mr-2" /> Start
          </Button>
          <Button onClick={handleNext} variant="secondary" className="text-lg py-6" disabled={isLoadingInitialCards || isGeneratingBatch}>
            <ArrowRight className="h-6 w-6 mr-2" /> Next
          </Button>
        </div>
        
        <div className="w-full max-w-md flex justify-center gap-4">
            <AddCardModal onAddCard={handleAddCard} />
            <Button onClick={handleShuffle} variant="outline" disabled={isLoadingInitialCards || isGeneratingBatch}>
                <Shuffle className="mr-2 h-4 w-4" /> Shuffle Deck
            </Button>
        </div>
      </main>

      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Creepy Cards. All rights reserved... or are they?</p>
      </footer>
    </div>
  );
}


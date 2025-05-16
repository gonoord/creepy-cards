
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CreepyCard } from '@/types';
import { generateInitialCards } from '@/lib/initial-cards';
import CreepyCardDisplay from '@/components/creepy-card';
import AddCardModal from '@/components/add-card-modal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, HomeIcon, Ghost, Shuffle, Loader2 } from 'lucide-react';
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
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
  const { toast } = useToast();

  const [isGeneratingSingleImage, setIsGeneratingSingleImage] = useState(false);
  const [singleImageLoadingId, setSingleImageLoadingId] = useState<string | null>(null);


  useEffect(() => {
    if (isLoadingInitialCards && cards.length === 0) {
      const intervalId = setInterval(() => {
        setCurrentLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [isLoadingInitialCards, cards.length]);

  const loadCoreCards = useCallback(async (isShuffleOp = false) => {
    setIsLoadingInitialCards(true); // Ensure loading state is true at the beginning
    setCurrentLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
    
    const initialGeneratedCards = await generateInitialCards();

    let userCards: CreepyCard[] = [];
    if (isBrowser && !isShuffleOp) {
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

    setCards(isShuffleOp ? initialGeneratedCards : [...initialGeneratedCards, ...userCards]);
    setIsLoadingInitialCards(false);
    setCurrentIndex(0);
    setAnimationKey(prevKey => prevKey + 1);

    if (initialGeneratedCards.length > 0 && !isShuffleOp) {
       toast({
        title: "The First Visions Are Ready",
        description: "Initial creepy cards have been summoned. More will appear as you explore.",
      });
    } else if (isShuffleOp && initialGeneratedCards.length > 0) {
        toast({
            title: "Deck Reshuffled!",
            description: "A fresh set of nightmares awaits.",
        });
    } else if (initialGeneratedCards.length === 0) {
       toast({
        title: isShuffleOp ? "Shuffle Anomaly" : "A Quiet Start",
        description: isShuffleOp ? "The deck vanished! Try creating cards or shuffling again." : "No initial cards were generated. Feel free to create your own!",
        variant: "destructive",
      });
    }
  }, [toast]);


  useEffect(() => {
    loadCoreCards(false);
  }, [loadCoreCards]);


  useEffect(() => {
    if (isBrowser && !isLoadingInitialCards) {
      const userCardsToSave = cards.filter(card => card.isAIGenerated && !card.id.startsWith('initial-'));
      localStorage.setItem('creepyUserCards', JSON.stringify(userCardsToSave));
    }
  }, [cards, isLoadingInitialCards]);

  const triggerAnimation = () => {
    setAnimationKey(prevKey => prevKey + 1);
  };

  const handleNext = useCallback(async () => {
    if (isLoadingInitialCards || isGeneratingSingleImage || cards.length === 0) return;

    const nextIdx = (currentIndex + 1) % cards.length;
    setCurrentIndex(nextIdx);
    triggerAnimation();

    const cardToLoad = cards[nextIdx];

    if (cardToLoad && !cardToLoad.imageGenerated && cardToLoad.imageUrl.startsWith('https://placehold.co')) {
      setIsGeneratingSingleImage(true);
      setSingleImageLoadingId(cardToLoad.id);
      try {
        const imageResult = await generateCreepyImage({ prompt: cardToLoad.phrase });
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === cardToLoad.id
              ? { ...card, imageUrl: imageResult.imageDataUri, isAIGenerated: true, imageGenerated: true }
              : card
          )
        );
        toast({
          title: "A New Vision Materializes",
          description: `Image for "${cardToLoad.phrase}" has been conjured.`,
        });
      } catch (error) {
        console.error(`Failed to generate image for card "${cardToLoad.phrase}":`, error);
        toast({
          title: "Spiritual Interference",
          description: `Could not conjure an image for "${cardToLoad.phrase}". The placeholder remains.`,
          variant: "destructive",
        });
        // Mark as generated even on failure to avoid retrying this specific card indefinitely in this session
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === cardToLoad.id ? { ...card, imageGenerated: true, imageUrl: cardToLoad.imageUrl || 'https://placehold.co/600x400.png' } : card
          )
        );
      } finally {
        setIsGeneratingSingleImage(false);
        setSingleImageLoadingId(null);
      }
    }
  }, [currentIndex, cards, isLoadingInitialCards, isGeneratingSingleImage, toast]);

  const handlePrev = useCallback(() => {
    if (isLoadingInitialCards || isGeneratingSingleImage || cards.length === 0 || currentIndex === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
    triggerAnimation();
  }, [cards.length, currentIndex, isLoadingInitialCards, isGeneratingSingleImage]);

  const handleGoToStart = useCallback(() => {
    if (isLoadingInitialCards || isGeneratingSingleImage || cards.length === 0) return;
    setCurrentIndex(0);
    triggerAnimation();
  }, [cards.length, isLoadingInitialCards, isGeneratingSingleImage]);

  const handleAddCard = useCallback((newCardData: Omit<CreepyCard, 'id' | 'imageGenerated'>) => {
    if (isLoadingInitialCards || isGeneratingSingleImage) return;
    const newCard: CreepyCard = {
      ...newCardData,
      id: uuidv4(),
      imageGenerated: true, // User-added cards have their images generated in the modal
    };
    setCards((prevCards) => {
      const updatedCards = [...prevCards, newCard];
      if (updatedCards.length === 1) {
        setCurrentIndex(0);
      } else {
        setCurrentIndex(updatedCards.length - 1);
      }
      return updatedCards;
    });
    triggerAnimation();
  }, [isLoadingInitialCards, isGeneratingSingleImage]);

  const handleShuffle = useCallback(async () => {
    if (isLoadingInitialCards || isGeneratingSingleImage) return;

    toast({
      title: "Reshuffling the Horrors...",
      description: "A new deck of creepy cards is materializing.",
    });

    if (isBrowser) {
      localStorage.removeItem('creepyUserCards');
    }
    setCards([]); // Clear cards immediately for better UX
    setCurrentIndex(0);
    await loadCoreCards(true); // This will set setIsLoadingInitialCards

  }, [toast, loadCoreCards, isLoadingInitialCards, isGeneratingSingleImage]);

  const disableNextButton = isLoadingInitialCards || isGeneratingSingleImage || cards.length === 0;
  const disablePrevButton = isLoadingInitialCards || isGeneratingSingleImage || cards.length === 0 || currentIndex === 0;
  const disableStartButton = isLoadingInitialCards || isGeneratingSingleImage || cards.length === 0;
  const disableAddCardButton = isLoadingInitialCards || isGeneratingSingleImage;
  const disableShuffleButton = isLoadingInitialCards || isGeneratingSingleImage;


  if (isLoadingInitialCards && cards.length === 0) { // Show full loading screen only if cards array is still empty
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

  if (cards.length === 0 && !isLoadingInitialCards && !isGeneratingSingleImage) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
        <Ghost className="w-16 h-16 text-primary mb-4" />
        <p className="text-xl mb-4">The void is empty... for now.</p>
        <div className="flex gap-4">
            <AddCardModal onAddCard={handleAddCard} disabled={disableAddCardButton} />
            <Button onClick={handleShuffle} variant="outline" disabled={disableShuffleButton}>
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
            <CreepyCardDisplay
              key={animationKey}
              card={currentCard}
              className="h-full"
              isCurrentlyLoadingImage={currentCard.id === singleImageLoadingId && isGeneratingSingleImage}
            />
          ) : (
             // This case should ideally not be hit if cards.length > 0
            <div className="w-full max-w-md h-[550px] flex items-center justify-center bg-card rounded-lg shadow-xl p-4">
                 <p className="text-muted-foreground">No card to display...</p>
            </div>
           )
          }
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
          <Button onClick={handlePrev} variant="secondary" className="text-lg py-6" disabled={disablePrevButton}>
            <ArrowLeft className="h-6 w-6 mr-2" /> Previous
          </Button>
          <Button onClick={handleGoToStart} variant="secondary" className="text-lg py-6" disabled={disableStartButton}>
            <HomeIcon className="h-6 w-6 mr-2" /> Start
          </Button>
          <Button onClick={handleNext} variant="secondary" className="text-lg py-6" disabled={disableNextButton}>
            Next <ArrowRight className="h-6 w-6 ml-2" />
          </Button>
        </div>

        <div className="w-full max-w-md flex justify-center gap-4">
            <AddCardModal onAddCard={handleAddCard} disabled={disableAddCardButton} />
            <Button onClick={handleShuffle} variant="outline" disabled={disableShuffleButton}>
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

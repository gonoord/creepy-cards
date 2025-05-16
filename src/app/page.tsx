"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CreepyCard } from '@/types';
import { generateInitialCards } from '@/lib/initial-cards';
import CreepyCardDisplay from '@/components/creepy-card';
import AddCardModal from '@/components/add-card-modal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, HomeIcon, Ghost } from 'lucide-react'; // Ghost for title
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Helper to check if running in browser
const isBrowser = typeof window !== 'undefined';

export default function HomePage() {
  const [cards, setCards] = useState<CreepyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0); // Used to re-trigger animation

  // Load initial and custom cards
  useEffect(() => {
    const initialCards = generateInitialCards();
    let userCards: CreepyCard[] = [];
    if (isBrowser) {
      const storedUserCards = localStorage.getItem('creepyUserCards');
      if (storedUserCards) {
        try {
          userCards = JSON.parse(storedUserCards);
        } catch (e) {
          console.error("Failed to parse user cards from localStorage", e);
          localStorage.removeItem('creepyUserCards'); // Clear corrupted data
        }
      }
    }
    setCards([...initialCards, ...userCards]);
  }, []);

  // Save custom cards to localStorage
  useEffect(() => {
    if (isBrowser) {
      const userCards = cards.filter(card => card.isAIGenerated);
      localStorage.setItem('creepyUserCards', JSON.stringify(userCards));
    }
  }, [cards]);

  const triggerAnimation = () => {
    setAnimationKey(prevKey => prevKey + 1);
  };

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
    triggerAnimation();
  }, [cards.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
    triggerAnimation();
  }, [cards.length]);

  const handleGoToStart = useCallback(() => {
    setCurrentIndex(0);
    triggerAnimation();
  }, []);

  const handleAddCard = useCallback((newCardData: Omit<CreepyCard, 'id'>) => {
    const newCard: CreepyCard = {
      ...newCardData,
      id: uuidv4(), // Generate unique ID
    };
    setCards((prevCards) => [...prevCards, newCard]);
    setCurrentIndex(cards.length); // Navigate to the new card (which will be at the new length - 1)
    triggerAnimation();
  }, [cards.length]);


  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
        <Ghost className="w-16 h-16 text-primary mb-4 animate-pulse" />
        <p className="text-xl">Loading creepy cards...</p>
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
           {/* Use animationKey to force re-render of CreepyCardDisplay for animation */}
          <CreepyCardDisplay key={animationKey} card={currentCard} className="h-full" />
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
          <Button onClick={handlePrev} variant="outline" className="text-lg py-6 bg-card hover:bg-card/80 border-primary/50 text-primary hover:text-primary/90">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Button onClick={handleGoToStart} variant="outline" className="text-lg py-6 bg-card hover:bg-card/80 border-primary/50 text-primary hover:text-primary/90">
            <HomeIcon className="h-6 w-6" />
          </Button>
          <Button onClick={handleNext} variant="outline" className="text-lg py-6 bg-card hover:bg-card/80 border-primary/50 text-primary hover:text-primary/90">
            <ArrowRight className="h-6 w-6" />
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

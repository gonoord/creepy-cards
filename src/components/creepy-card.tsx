
"use client";

import Image from 'next/image';
import type { CreepyCard } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CreepyCardProps {
  card: CreepyCard | null;
  className?: string;
}

export default function CreepyCardDisplay({ card, className }: CreepyCardProps) {
  if (!card) {
    return (
      <div className={cn("w-full max-w-md h-[500px] flex items-center justify-center bg-card rounded-lg shadow-xl", className)}>
        <p className="text-muted-foreground">No card to display.</p>
      </div>
    );
  }

  const imageUrl = card.imageUrl || 'https://placehold.co/600x400.png';

  return (
    <Card className={cn("w-full max-w-md overflow-hidden shadow-2xl creepy-card-enter subtle-flicker flex flex-col", className)}
      style={{'--primary-hsl': '269 38% 44%'} as React.CSSProperties} // for flicker animation access
    >
      <CardContent className="p-0 flex-grow relative"> {/* Make content area grow and relative for Image fill */}
        <div className="relative w-full h-full bg-muted"> {/* Image container fills CardContent */}
          <Image
            src={imageUrl}
            alt={card.phrase}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            data-ai-hint={card.aiHint || (card.isAIGenerated ? "creepy art" : "placeholder image")}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={!card.isAIGenerated && !!card.imageUrl} 
          />
        </div>
      </CardContent>
      <CardFooter className="p-6 bg-card-foreground/5 backdrop-blur-sm">
        <p className="text-lg font-medium text-center text-foreground w-full leading-relaxed">
          {card.phrase}
        </p>
      </CardFooter>
    </Card>
  );
}

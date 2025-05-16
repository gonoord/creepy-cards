
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { filterCreepiness } from '@/ai/flows/filter-creepiness';
import { generateCreepyImage } from '@/ai/flows/generate-creepy-image';
import type { CreepyCard } from '@/types';
import { Loader2, Wand2 } from 'lucide-react';

const formSchema = z.object({
  phrase: z.string().min(5, "Phrase must be at least 5 characters long.").max(150, "Phrase is too long."),
  prompt: z.string().min(10, "Prompt must be at least 10 characters long.").max(200, "Prompt is too long."),
});

type FormData = z.infer<typeof formSchema>;

interface AddCardModalProps {
  onAddCard: (card: Omit<CreepyCard, 'id' | 'imageGenerated'>) => void;
  disabled?: boolean;
}

export default function AddCardModal({ onAddCard, disabled }: AddCardModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsGenerating(true);
    try {
      // Step 1: Filter creepiness
      toast({ title: "Analyzing prompt...", description: "Checking if your prompt is creepy enough." });
      const filterResult = await filterCreepiness({ prompt: data.prompt });

      if (!filterResult.isCreepyEnough) {
        toast({
          title: "Prompt Not Creepy Enough",
          description: `Your prompt scored ${filterResult.creepinessScore.toFixed(2)}. Please try a more terrifying idea!`,
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      toast({ title: "Prompt is spooky!", description: "Generating your creepy image..." });
      // Step 2: Generate image
      const imageResult = await generateCreepyImage({ prompt: data.prompt });

      onAddCard({
        phrase: data.phrase,
        imageUrl: imageResult.imageDataUri,
        isAIGenerated: true,
        // imageGenerated is set to true by the onAddCard handler in HomePage
      });

      toast({
        title: "Card Created!",
        description: "Your new creepy card has been added to the deck.",
      });
      reset();
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating card:", error);
      toast({
        title: "Generation Failed",
        description: "Something went wrong while creating your card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        reset(); // Reset form when dialog is closed
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={disabled || isGenerating}>
          <Wand2 className="mr-2 h-4 w-4" /> Add New Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-primary">Conjure a New Card</DialogTitle>
          <DialogDescription>
            Craft a new tale of terror. Describe your vision, and let the AI bring it to life.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="phrase" className="text-foreground">Story Phrase</Label>
            <Textarea
              id="phrase"
              placeholder="e.g., The old house sighed in the dead of night..."
              {...register("phrase")}
              className="bg-input text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
            {errors.phrase && <p className="text-sm text-destructive">{errors.phrase.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt" className="text-foreground">Image Prompt for AI</Label>
            <Input
              id="prompt"
              placeholder="e.g., A shadowy figure in a derelict Victorian room, dust motes in moonlight"
              {...register("prompt")}
              className="bg-input text-foreground placeholder:text-muted-foreground"
            />
            {errors.prompt && <p className="text-sm text-destructive">{errors.prompt.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isGenerating} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Summoning...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Create Card
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bot, PlusCircle, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import type { getProfile, updateBrandHeart, BrandHeartData, AudiencePersona } from '@/app/brand-heart/actions';
import { generateAudienceSuggestion } from '@/ai/flows/generate-aud-flow';

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
type UpdateBrandHeartAction = typeof updateBrandHeart;
type GenerateAudienceAction = typeof generateAudienceSuggestion;

export interface AudienceFormProps {
    profile: Profile | null;
    brandHeart: BrandHeartData | null;
    updateBrandHeartAction: UpdateBrandHeartAction;
    generateAudienceAction: GenerateAudienceAction;
}

export function AudienceForm({
    profile,
    brandHeart: initialBrandHeart,
    updateBrandHeartAction,
    generateAudienceAction,
}: AudienceFormProps) {
    const [personas, setPersonas] = useState<AudiencePersona[]>(initialBrandHeart?.audience || []);
    const [userHint, setUserHint] = useState('');
    const [isSaving, startSaving] = useTransition();
    const [isGenerating, startGenerating] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        setPersonas(initialBrandHeart?.audience || []);
    }, [initialBrandHeart]);


    const handlePersonaChange = (id: string, field: 'title' | 'content', value: string) => {
        setPersonas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };
    
    const handleAddPersona = () => {
        const newPersona: AudiencePersona = {
            id: crypto.randomUUID(),
            title: 'New Persona',
            content: ''
        };
        setPersonas(prev => [...prev, newPersona]);
    };

    const handleRemovePersona = (id: string) => {
        setPersonas(prev => prev.filter(p => p.id !== id));
    };

    const handleGeneratePersona = async () => {
        startGenerating(async () => {
            try {
                const result = await generateAudienceAction({ userHint });
                const newPersona: AudiencePersona = {
                    id: crypto.randomUUID(),
                    title: result.profileText.split('\n')[0].replace('## ', ''),
                    content: result.profileText
                };
                setPersonas(prev => [...prev, newPersona]);
                toast({ title: 'Audience Persona Generated!', description: 'A new persona has been added to your list.' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
            }
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const formData = new FormData();
        formData.append('audience', JSON.stringify(personas));

        startSaving(async () => {
            try {
                await updateBrandHeartAction(formData);
                toast({ title: 'Success!', description: 'Audience profiles saved.' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <Card className="bg-secondary/30">
                <CardContent className="p-6 space-y-4">
                    <Label htmlFor="user-hint" className="text-lg font-semibold">AI Generation Hints</Label>
                    <Textarea 
                        id="user-hint"
                        value={userHint}
                        onChange={(e) => setUserHint(e.target.value)}
                        placeholder="Give the AI some context. e.g., 'My audience is local to my city, mostly women aged 25-50 who are interested in holistic health.'"
                    />
                    <Button type="button" onClick={handleGeneratePersona} disabled={isGenerating}>
                        <Bot className="mr-2 h-4 w-4" />
                        {isGenerating ? 'Generating Persona...' : 'Generate New Persona with AI'}
                    </Button>
                </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full space-y-4">
                {personas.map((persona, index) => (
                    <AccordionItem value={`item-${index}`} key={persona.id} className="border rounded-lg bg-card">
                        <AccordionTrigger className="p-4 hover:no-underline">
                             <div className="flex justify-between items-center w-full">
                                <Input 
                                    value={persona.title}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handlePersonaChange(persona.id, 'title', e.target.value)}
                                    className="text-lg font-bold border-0 shadow-none -ml-3 focus-visible:ring-1 focus-visible:ring-primary h-auto p-2"
                                />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Persona?</AlertDialogTitle>
                                            <AlertDialogDescription>Are you sure you want to delete the "{persona.title}" persona?</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemovePersona(persona.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <Textarea 
                                value={persona.content}
                                onChange={(e) => handlePersonaChange(persona.id, 'content', e.target.value)}
                                rows={8}
                                placeholder="Describe this buyer persona..."
                            />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            
            <div className="flex justify-between items-center">
                 <Button type="button" variant="outline" onClick={handleAddPersona}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Buyer Persona
                </Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save All Audiences'}
                </Button>
            </div>
        </form>
    );
}

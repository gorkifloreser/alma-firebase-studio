
'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createOffering, translateText, Offering } from '../actions';
import { Sparkles } from 'lucide-react';
import { languages } from '@/lib/languages';

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

interface CreateOfferingDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    profile: Profile;
    onOfferingCreated: () => void;
}

const initialOfferingState: Omit<Offering, 'id' | 'user_id' | 'created_at'> = {
    title: { primary: '', secondary: '' },
    description: { primary: '', secondary: '' },
    type: 'Service',
    contextual_notes: '',
};

export function CreateOfferingDialog({
    isOpen,
    onOpenChange,
    profile,
    onOfferingCreated,
}: CreateOfferingDialogProps) {
    const [offering, setOffering] = useState(initialOfferingState);
    const [isSaving, startSaving] = useTransition();
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const { toast } = useToast();

    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    const handleFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
        name: string
    ) => {
        if (typeof e === 'string') {
            // Handle Select change
            setOffering(prev => ({ ...prev, [name]: e as Offering['type'] }));
        } else {
            const { name: inputName, value } = e.target;
            if (inputName.includes('_')) {
                const [field, lang] = inputName.split('_') as [keyof Omit<Offering, 'type' | 'contextual_notes'>, 'primary' | 'secondary'];
                 setOffering(prev => ({
                    ...prev,
                    [field]: { ...prev[field], [lang]: value }
                }));
            } else {
                setOffering(prev => ({ ...prev, [inputName]: value }));
            }
        }
    };
    
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!offering.title.primary || !offering.description.primary) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill in the primary title and description.',
            });
            return;
        }

        startSaving(async () => {
            try {
                await createOffering(offering);
                onOfferingCreated();
                setOffering(initialOfferingState); // Reset form
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Uh oh! Something went wrong.',
                    description: error.message,
                });
            }
        });
    };
    
    const handleAutoTranslate = async (fieldId: keyof Omit<Offering, 'type' | 'contextual_notes'>) => {
        if (!profile?.secondary_language) return;

        const primaryText = offering[fieldId].primary;
        const targetLanguage = languageNames.get(profile.secondary_language) || profile.secondary_language;

        if (!primaryText) {
            toast({
                variant: 'destructive',
                title: 'Nothing to translate',
                description: 'Please enter some text in the primary field first.',
            });
            return;
        }

        setIsTranslating(fieldId);
        try {
            const result = await translateText({ text: primaryText, targetLanguage });
            setOffering(prev => ({
                ...prev,
                [fieldId]: { ...prev[fieldId], secondary: result.translatedText }
            }));
            toast({
                title: 'Translated!',
                description: `Text has been translated to ${targetLanguage}.`,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Translation Failed',
                description: error.message,
            });
        } finally {
            setIsTranslating(null);
        }
    };

    const BilingualFormField = ({ id, label, isTextarea = false }: { id: keyof Omit<Offering, 'type' | 'contextual_notes'>, label: string, isTextarea?: boolean }) => {
        const InputComponent = isTextarea ? Textarea : Input;
        return (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label htmlFor={`${id}_primary`} className="text-md font-semibold">{label}</Label>
                     {profile?.secondary_language && (
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="gap-2" 
                            onClick={() => handleAutoTranslate(id)}
                            disabled={isTranslating === id}
                        >
                            <Sparkles className={`h-4 w-4 ${isTranslating === id ? 'animate-spin' : ''}`} />
                            {isTranslating === id ? 'Translating...' : 'Auto-translate'}
                        </Button>
                    )}
                </div>
                <div className={`grid gap-4 ${profile?.secondary_language ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                         <Label htmlFor={`${id}_primary`} className="text-sm text-muted-foreground">Primary ({languageNames.get(profile?.primary_language || 'en')})</Label>
                        <InputComponent id={`${id}_primary`} name={`${id}_primary`} value={offering[id].primary || ''} onChange={handleFormChange} className="mt-1" />
                    </div>
                    {profile?.secondary_language && (
                         <div>
                            <Label htmlFor={`${id}_secondary`} className="text-sm text-muted-foreground">Secondary ({languageNames.get(profile.secondary_language)})</Label>
                            <InputComponent id={`${id}_secondary`} name={`${id}_secondary`} value={offering[id].secondary || ''} onChange={handleFormChange} className="mt-1" />
                        </div>
                    )}
                </div>
            </div>
        )
    };


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Create a New Offering</DialogTitle>
                    <DialogDescription>
                        Add a new product, service, or event to your catalog. This will be used by the AI to generate content.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-8 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="type" className="text-md font-semibold">Type of Offering</Label>
                         <Select name="type" value={offering.type} onValueChange={(value) => handleFormChange(value, 'type')}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Select the type of offering" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Service">Service</SelectItem>
                                <SelectItem value="Product">Product</SelectItem>
                                <SelectItem value="Event">Event</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <BilingualFormField id="title" label="Title" />
                    <BilingualFormField id="description" label="Description" isTextarea />
                    
                    <div className="space-y-2">
                         <Label htmlFor="contextual_notes" className="text-md font-semibold">Contextual Notes (Optional)</Label>
                        <Textarea id="contextual_notes" name="contextual_notes" value={offering.contextual_notes || ''} onChange={handleFormChange} placeholder="e.g., 'This is a pre-sale for my upcoming book', 'For beginners only', 'Limited to 10 spots'." />
                         <p className="text-sm text-muted-foreground">
                            Provide any specific context the AI should know for this campaign.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Creating...' : 'Create Offering'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}



'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
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
import { createOffering, updateOffering, translateText, uploadSingleOfferingMedia, deleteOfferingMedia, generateOfferingDraft, getOffering } from '../actions';
import type { Offering, OfferingMedia } from '../actions';
import { Sparkles, Calendar as CalendarIcon, Clock, Bot, Wand2 } from 'lucide-react';
import { languages } from '@/lib/languages';
import { currencies } from '@/lib/currencies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { ImageUpload } from './ImageUpload';
import { Separator } from '@/components/ui/separator';


type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

type OfferingFormData = Omit<Offering, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'event_date'> & {
    id?: string;
    event_date: Date | null;
    offering_media: OfferingMedia[];
};

const initialOfferingState: OfferingFormData = {
    title: { primary: '', secondary: '' },
    description: { primary: '', secondary: '' },
    type: 'Service',
    contextual_notes: '',
    price: null,
    currency: 'USD',
    event_date: null,
    duration: null,
    frequency: 'One-time',
    offering_media: [],
};

type BilingualFieldProps = {
    id: 'title' | 'description';
    label: string;
    isTextarea?: boolean;
    offering: OfferingFormData;
    profile: Profile;
    isTranslating: string | null;
    languageNames: Map<string, string>;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, name?: string) => void;
    handleAutoTranslate: (fieldId: 'title' | 'description') => void;
};

const BilingualFormField = ({ 
    id, 
    label, 
    isTextarea = false,
    offering,
    profile,
    isTranslating,
    languageNames,
    handleFormChange,
    handleAutoTranslate
}: BilingualFieldProps) => {
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
                    <InputComponent id={`${id}_primary`} name={`${id}_primary`} value={offering[id]?.primary || ''} onChange={handleFormChange} className="mt-1" />
                </div>
                {profile?.secondary_language && (
                     <div>
                        <Label htmlFor={`${id}_secondary`} className="text-sm text-muted-foreground">Secondary ({languageNames.get(profile.secondary_language)})</Label>
                        <InputComponent id={`${id}_secondary`} name={`${id}_secondary`} value={offering[id]?.secondary || ''} onChange={handleFormChange} className="mt-1" />
                    </div>
                )}
            </div>
        </div>
    )
};

// Generate time options for the select dropdown
const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { value: time, label: format(new Date(2000, 0, 1, hours, minutes), 'p') }; // Format to AM/PM
});

interface CreateOfferingDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    profile: Profile;
    onOfferingSaved: () => void;
    offeringToEdit: OfferingWithMedia | null;
}

export function CreateOfferingDialog({
    isOpen,
    onOpenChange,
    profile,
    onOfferingSaved,
    offeringToEdit,
}: CreateOfferingDialogProps) {
    const [offering, setOffering] = useState<OfferingFormData>(initialOfferingState);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const { toast } = useToast();

    const isEditMode = !!offering.id;
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    const resetState = useCallback(() => {
        if (offeringToEdit) {
            const date = offeringToEdit.event_date ? parseISO(offeringToEdit.event_date) : null;
            setOffering({
                ...initialOfferingState,
                ...offeringToEdit,
                event_date: date,
            });
        } else {
            setOffering(initialOfferingState);
        }
        setAiPrompt('');
    }, [offeringToEdit]);

    useEffect(() => {
        if (isOpen) {
            resetState();
        }
    }, [offeringToEdit, isOpen, resetState]);


    const handleFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string | Date | undefined | null,
        name?: string
    ) => {
         setOffering(prev => {
            if (name === 'event_date') {
                const newDate = e instanceof Date ? e : null;
                const existingDate = prev.event_date || new Date();
                if (newDate) {
                    newDate.setHours(existingDate.getHours(), existingDate.getMinutes());
                }
                return { ...prev, event_date: newDate };
            }
             if (name === 'event_time') {
                const timeValue = e as string;
                if (!timeValue) return { ...prev };
                const [hours, minutes] = timeValue.split(':').map(Number);
                const newDate = prev.event_date ? new Date(prev.event_date) : new Date();
                if(!isNaN(hours) && !isNaN(minutes)) {
                    newDate.setHours(hours, minutes);
                    return { ...prev, event_date: newDate };
                }
                return { ...prev };
            }

            if (typeof e === 'string' && name) {
                return { ...prev, [name]: e as Offering['type'] | Offering['currency'] | Offering['frequency'] };
            }
            
            if (typeof e !== 'string' && e && 'target' in e) {
                const { name: inputName, value } = e.target as HTMLInputElement | HTMLTextAreaElement;
                 if (inputName.includes('_')) {
                    const [field, lang] = inputName.split('_') as ['title' | 'description', 'primary' | 'secondary'];
                    if (field === 'title' || field === 'description') {
                        return { ...prev, [field]: { ...prev[field], [lang]: value } };
                    }
                }
                if (inputName === 'price') {
                    return { ...prev, [inputName]: value === '' ? null : Number(value) };
                }
                if (inputName === 'contextual_notes' || inputName === 'duration') {
                    return { ...prev, [inputName]: value };
                }
                return { ...prev, [inputName]: value };
            }
            return prev;
        });
    };
    
    const handleRemoveExistingMedia = async (mediaId: string) => {
        const originalMedia = [...offering.offering_media];
        setOffering(prev => ({
            ...prev,
            offering_media: prev.offering_media.filter(m => m.id !== mediaId)
        }));
        try {
            await deleteOfferingMedia(mediaId);
            toast({
                title: 'Media removed',
                description: 'The image has been successfully deleted.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to remove media',
                description: error.message,
            });
            setOffering(prev => ({ ...prev, offering_media: originalMedia }));
        }
    }

    const onNewMediaUploaded = (newMedia: OfferingMedia) => {
        setOffering(prev => ({
            ...prev,
            offering_media: [...prev.offering_media, newMedia]
        }));
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
                const payload = {
                    title: offering.title,
                    description: offering.description,
                    type: offering.type,
                    contextual_notes: offering.contextual_notes,
                    price: offering.price,
                    currency: offering.currency,
                    event_date: offering.event_date?.toISOString() ?? null,
                    duration: offering.duration,
                    frequency: offering.frequency,
                };

                if (isEditMode) {
                    await updateOffering(offering.id!, payload);
                } else {
                    const newOffering = await createOffering(payload);
                    setOffering(prev => ({ ...prev, id: newOffering.id }));
                    toast({
                        title: 'Draft Created!',
                        description: "You can now upload media for your offering.",
                    });
                    // We don't close the dialog, we just transition to edit mode.
                    return; // Prevent full save toast
                }
                
                onOfferingSaved();

            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Uh oh! Something went wrong.',
                    description: error.message,
                });
            }
        });
    };
    
    const handleAutoTranslate = async (fieldId: 'title' | 'description') => {
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

    const handleGenerateDraft = () => {
        if (!aiPrompt.trim()) {
            toast({ variant: 'destructive', title: 'Please provide a prompt for the AI.' });
            return;
        }
        startGenerating(async () => {
            try {
                const result = await generateOfferingDraft({ prompt: aiPrompt });
                setOffering(prev => ({
                    ...prev,
                    title: { ...prev.title, primary: result.title },
                    description: { ...prev.description, primary: result.description },
                    type: result.type,
                    price: result.price ?? prev.price,
                    currency: result.currency ?? prev.currency,
                    contextual_notes: result.contextual_notes ?? prev.contextual_notes,
                    event_date: result.event_date && isValid(parseISO(result.event_date)) ? parseISO(result.event_date) : prev.event_date,
                    duration: result.duration ?? prev.duration,
                    frequency: result.frequency ?? prev.frequency,
                }));
                toast({ title: 'Draft Generated!', description: 'Review the generated content below.'});
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Generation Failed',
                    description: error.message,
                });
            }
        });
    };

    const eventTime = offering.event_date && isValid(offering.event_date) ? format(offering.event_date, 'HH:mm') : '';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>{offering.id ? 'Edit Offering' : 'Create a New Offering'}</DialogTitle>
                    <DialogDescription>
                        {offering.id ? 'Update the details of your offering.' : 'Add a new product, service, or event to your catalog.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-8 py-4 max-h-[80vh] overflow-y-auto pr-6">
                    {!isEditMode && (
                         <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                            <Label htmlFor="ai-prompt" className="text-md font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Describe Your Offering Idea</Label>
                            <Textarea 
                                id="ai-prompt"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="e.g., 'A 90-minute ceremonial cacao gathering for the new moon, held online, for 500 MXN. This is for people new to ceremonial cacao.'"
                                className="bg-background"
                            />
                            <Button type="button" onClick={handleGenerateDraft} disabled={isGenerating}>
                                <Wand2 className="mr-2 h-4 w-4" />
                                {isGenerating ? 'Generating Draft...' : 'Generate with AI'}
                            </Button>
                        </div>
                    )}
                     <Separator />


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

                    <BilingualFormField 
                        id="title" 
                        label="Title" 
                        offering={offering} 
                        profile={profile} 
                        isTranslating={isTranslating} 
                        languageNames={languageNames} 
                        handleFormChange={handleFormChange} 
                        handleAutoTranslate={handleAutoTranslate} 
                    />
                    <BilingualFormField 
                        id="description" 
                        label="Description" 
                        isTextarea 
                        offering={offering} 
                        profile={profile} 
                        isTranslating={isTranslating} 
                        languageNames={languageNames} 
                        handleFormChange={handleFormChange} 
                        handleAutoTranslate={handleAutoTranslate}
                    />
                    
                    <div className="space-y-2">
                         <Label className="text-md font-semibold">Price</Label>
                        <div className="flex gap-2">
                            <Input 
                                id="price" 
                                name="price" 
                                type="number" 
                                value={offering.price ?? ''} 
                                onChange={handleFormChange} 
                                placeholder="e.g., 99.99"
                                className="w-2/3"
                            />
                            <Select name="currency" value={offering.currency || 'USD'} onValueChange={(value) => handleFormChange(value, 'currency')}>
                                <SelectTrigger className="w-1/3">
                                    <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencies.map(c => (
                                        <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {offering.type === 'Event' && (
                        <div className="space-y-6 p-4 border rounded-md">
                            <h3 className="font-semibold text-lg">Event Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                <Label htmlFor="event_date">Event Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !offering.event_date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {offering.event_date && isValid(offering.event_date) ? format(offering.event_date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={offering.event_date ?? undefined}
                                        onSelect={(date) => handleFormChange(date, 'event_date')}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                </div>
                                <div className="space-y-2">
                                     <Label htmlFor="event_time">Event Time</Label>
                                    <Select name="event_time" value={eventTime} onValueChange={(value) => handleFormChange(value, 'event_time')}>
                                        <SelectTrigger id="event_time" className="pl-10">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <SelectValue placeholder="Select time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration</Label>
                                    <Input id="duration" name="duration" value={offering.duration || ''} onChange={handleFormChange} placeholder="e.g., 2 hours, 3 days" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="frequency">Frequency</Label>
                                    <Select name="frequency" value={offering.frequency || 'One-time'} onValueChange={(value) => handleFormChange(value, 'frequency')}>
                                        <SelectTrigger id="frequency">
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="One-time">One-time</SelectItem>
                                            <SelectItem value="Weekly">Weekly</SelectItem>
                                            <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                                            <SelectItem value="Monthly">Monthly</SelectItem>
                                            <SelectItem value="Yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                    
                     <div className="space-y-2">
                         <Label className="text-md font-semibold">Offering Media</Label>
                         <ImageUpload
                            offeringId={offering.id}
                            onNewMediaUploaded={onNewMediaUploaded}
                            existingMedia={offering.offering_media || []}
                            onRemoveExistingMedia={handleRemoveExistingMedia}
                            offeringContext={{ title: offering.title.primary, description: offering.description.primary }}
                         />
                         <p className="text-sm text-muted-foreground">
                            Upload images for your offering. Add a description for AI context.
                        </p>
                    </div>

                    <div className="space-y-2">
                         <Label htmlFor="contextual_notes" className="text-md font-semibold">Contextual Notes (Optional)</Label>
                        <Textarea id="contextual_notes" name="contextual_notes" value={offering.contextual_notes || ''} onChange={handleFormChange} placeholder="e.g., 'This is a pre-sale for my upcoming book', 'For beginners only', 'Limited to 10 spots'." />
                         <p className="text-sm text-muted-foreground">
                            Provide any specific context the AI should know for this campaign.
                        </p>
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-background py-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create & Continue')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

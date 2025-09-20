

'use client';

import { useState, useTransition, useEffect } from 'react';
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
import { createOffering, updateOffering, translateText, uploadOfferingMedia, deleteOfferingMedia, generateOfferingDraft } from '../actions';
import type { Offering, OfferingMedia } from '../actions';
import { Sparkles, Calendar as CalendarIcon, Clock, Bot, Wand2 } from 'lucide-react';
import { languages } from '@/lib/languages';
import { currencies } from '@/lib/currencies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ImageUpload } from './ImageUpload';
import { Separator } from '@/components/ui/separator';


type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

type FileWithDescription = {
    file: File;
    description: string;
};

type OfferingFormData = Omit<Offering, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'event_date'> & {
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
    const [newMediaFiles, setNewMediaFiles] = useState<FileWithDescription[]>([]);
    const { toast } = useToast();

    const isEditMode = offeringToEdit !== null;
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && offeringToEdit) {
                const date = offeringToEdit.event_date ? parseISO(offeringToEdit.event_date) : null;
                setOffering({
                    ...initialOfferingState,
                    ...offeringToEdit,
                    event_date: date,
                });
            } else {
                setOffering(initialOfferingState);
            }
            setNewMediaFiles([]);
            setAiPrompt('');
        }
    }, [offeringToEdit, isEditMode, isOpen]);


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
                const [hours, minutes] = timeValue.split(':').map(Number);
                const newDate = prev.event_date ? new Date(prev.event_date) : new Date();
                newDate.setHours(hours, minutes);
                return { ...prev, event_date: newDate };
            }

            if (typeof e === 'string' && name) {
                return { ...prev, [name]: e as Offering['type'] | Offering['currency'] };
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
        // Optimistically update UI
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
            // Revert UI if deletion fails
            setOffering(prev => ({ ...prev, offering_media: originalMedia }));
        }
    }
    
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
                let savedOffering: OfferingWithMedia;
                
                const payload = {
                    title: offering.title,
                    description: offering.description,
                    type: offering.type,
                    contextual_notes: offering.contextual_notes,
                    price: offering.price,
                    currency: offering.currency,
                    event_date: offering.event_date?.toISOString() ?? null,
                    duration: offering.duration,
                };

                if (isEditMode && offeringToEdit) {
                    savedOffering = await updateOffering(offeringToEdit.id, payload);
                } else {
                    savedOffering = await createOffering(payload);
                }
                
                if (newMediaFiles.length > 0) {
                    const batchSize = 3;
                    for (let i = 0; i < newMediaFiles.length; i += batchSize) {
                        const batch = newMediaFiles.slice(i, i + batchSize);
                        const formData = new FormData();
                        batch.forEach(item => {
                            formData.append('files', item.file);
                            formData.append('descriptions', item.description);
                        });
                        await uploadOfferingMedia(savedOffering.id, formData);
                    }
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
                    price: result.price ?? prev.price,
                    currency: result.currency ?? prev.currency,
                    contextual_notes: result.contextual_notes ?? prev.contextual_notes,
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

    const eventTime = offering.event_date ? format(offering.event_date, 'HH:mm') : '';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Offering' : 'Create a New Offering'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Update the details of your offering.' : 'Add a new product, service, or event to your catalog.'}
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
                                        {offering.event_date ? format(offering.event_date, "PPP") : <span>Pick a date</span>}
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
                                    <div className="relative">
                                         <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input id="event_time" name="event_time" type="time" value={eventTime} onChange={(e) => handleFormChange(e.target.value, 'event_time')} className="pl-10" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                 <Label htmlFor="duration">Duration</Label>
                                <Input id="duration" name="duration" value={offering.duration || ''} onChange={handleFormChange} placeholder="e.g., 2 hours, 3 days" />
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                         <Label className="text-md font-semibold">Offering Media</Label>
                         <ImageUpload
                            onFilesChange={setNewMediaFiles}
                            existingMedia={offering.offering_media || []}
                            onRemoveExistingMedia={handleRemoveExistingMedia}
                            isSaving={isSaving}
                            offeringContext={{ title: offering.title.primary, description: offering.description.primary }}
                         />
                         <p className="text-sm text-muted-foreground">
                            Upload images for your offering (Max 50MB per file). Add a description for AI context.
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
                            {isSaving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Offering')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


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
import { createOffering, translateText, Offering } from '../actions';
import { Sparkles, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { languages } from '@/lib/languages';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ImageUpload } from './ImageUpload';


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
    price: null,
    event_date: null,
    duration: null,
};

type BilingualFieldProps = {
    id: keyof Omit<Offering, 'type' | 'contextual_notes' | 'title' | 'description' | 'price' | 'event_date' | 'duration'> | 'title' | 'description';
    label: string;
    isTextarea?: boolean;
    offering: typeof initialOfferingState;
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
                        onClick={() => handleAutoTranslate(id as 'title' | 'description')}
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
    const [eventDate, setEventDate] = useState<Date | undefined>();
    const [eventTime, setEventTime] = useState('');


    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    useEffect(() => {
        if (eventDate && eventTime) {
            const [hours, minutes] = eventTime.split(':').map(Number);
            const combinedDate = new Date(eventDate);
            combinedDate.setHours(hours, minutes);
            setOffering(prev => ({...prev, event_date: combinedDate.toISOString()}));
        }
    }, [eventDate, eventTime])

    const handleFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
        name?: string
    ) => {
        if (typeof e === 'string') {
            // Handle Select change
            setOffering(prev => ({ ...prev, [name!]: e as Offering['type'] }));
        } else {
            const { name: inputName, value, type } = e.target;
            if (inputName.includes('_')) {
                const [field, lang] = inputName.split('_') as [keyof Omit<Offering, 'type' | 'contextual_notes'>, 'primary' | 'secondary'];
                 setOffering(prev => ({
                    ...prev,
                    [field]: { ...prev[field], [lang]: value }
                }));
            } else {
                 if (inputName === 'price') {
                    setOffering(prev => ({ ...prev, [inputName]: value === '' ? null : Number(value) }));
                 } else if (inputName === 'event_time') {
                    setEventTime(value);
                 }
                 else {
                    setOffering(prev => ({ ...prev, [inputName]: value }));
                }
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
                setEventDate(undefined);
                setEventTime('');
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

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Create a New Offering</DialogTitle>
                    <DialogDescription>
                        Add a new product, service, or event to your catalog. This will be used by the AI to generate content.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-8 py-4 max-h-[80vh] overflow-y-auto pr-6">
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
                         <Label htmlFor="price" className="text-md font-semibold">Price</Label>
                        <Input id="price" name="price" type="number" value={offering.price || ''} onChange={handleFormChange} placeholder="e.g., 99.99" />
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
                                        !eventDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={eventDate}
                                        onSelect={setEventDate}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                </div>
                                <div className="space-y-2">
                                     <Label htmlFor="event_time">Event Time</Label>
                                    <div className="relative">
                                         <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input id="event_time" name="event_time" type="time" value={eventTime} onChange={handleFormChange} className="pl-10" />
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
                         <ImageUpload />
                         <p className="text-sm text-muted-foreground">
                            Upload images for your offering.
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
                            {isSaving ? 'Creating...' : 'Create Offering'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

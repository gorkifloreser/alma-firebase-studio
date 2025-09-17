
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import type { Offering, OfferingMedia } from '../actions';
import { languages } from '@/lib/languages';
import { currencies } from '@/lib/currencies';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { Calendar, Clock, Tag, Globe, Package, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

interface OfferingDetailDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offering: OfferingWithMedia;
    profile: Profile;
}

const languageNames = new Map(languages.map(l => [l.value, l.label]));
const currencyLabels = new Map(currencies.map(c => [c.value, c.label]));

const DetailItem = ({ icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => {
    const Icon = icon;
    return (
        <div className="flex items-start gap-4">
            <Icon className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <div className="text-md text-foreground">{children}</div>
            </div>
        </div>
    );
}

export function OfferingDetailDialog({ isOpen, onOpenChange, offering, profile }: OfferingDetailDialogProps) {
    if (!offering) return null;
    
    const {
        title,
        description,
        type,
        price,
        currency,
        event_date,
        duration,
        contextual_notes,
        offering_media,
    } = offering;

    const formattedDate = event_date ? format(parseISO(event_date), 'PPP') : null;
    const formattedTime = event_date ? format(parseISO(event_date), 'p') : null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-3xl">{title.primary}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary">{type}</Badge>
                         {price && currency && (
                            <span className="text-lg font-semibold text-foreground">
                                {new Intl.NumberFormat(profile?.primary_language || 'en-US', { style: 'currency', currency: currency }).format(price)}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto pr-6 space-y-6">
                    {offering_media && offering_media.length > 0 && (
                        <Carousel className="w-full">
                            <CarouselContent>
                                {offering_media.map(media => (
                                    <CarouselItem key={media.id}>
                                        <div className="aspect-video relative">
                                            <Image 
                                                src={media.media_url}
                                                alt={title.primary || 'Offering image'}
                                                fill
                                                className="object-cover rounded-lg"
                                            />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                             {offering_media.length > 1 && (
                                <>
                                    <CarouselPrevious className="left-2" />
                                    <CarouselNext className="right-2" />
                                </>
                            )}
                        </Carousel>
                    )}

                    <div className="space-y-4">
                         <h3 className="font-semibold text-lg">Description ({languageNames.get(profile?.primary_language || 'en')})</h3>
                         <p className="text-muted-foreground whitespace-pre-wrap">{description.primary}</p>

                        {profile?.secondary_language && description.secondary && (
                            <>
                                <Separator />
                                <h3 className="font-semibold text-lg">Description ({languageNames.get(profile.secondary_language)})</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap">{description.secondary}</p>
                            </>
                        )}
                    </div>
                    
                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                         <DetailItem icon={Package} label="Type">
                           <Badge variant="outline">{type}</Badge>
                        </DetailItem>
                        
                        {price && currency && (
                            <DetailItem icon={Tag} label="Price">
                                {new Intl.NumberFormat(profile?.primary_language || 'en-US', { style: 'currency', currency: currency }).format(price)}
                            </DetailItem>
                        )}

                        {type === 'Event' && formattedDate && (
                             <DetailItem icon={Calendar} label="Event Date">
                                {formattedDate}
                            </DetailItem>
                        )}
                         {type === 'Event' && formattedTime && (
                             <DetailItem icon={Clock} label="Event Time">
                                {formattedTime}
                            </DetailItem>
                        )}
                        {type === 'Event' && duration && (
                             <DetailItem icon={Globe} label="Duration">
                                {duration}
                            </DetailItem>
                        )}
                    </div>

                    {contextual_notes && (
                        <>
                        <Separator />
                        <DetailItem icon={Sparkles} label="Contextual Notes for AI">
                            <p className="text-muted-foreground italic">"{contextual_notes}"</p>
                        </DetailItem>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}


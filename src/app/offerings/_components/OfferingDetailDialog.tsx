
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import type { Offering, OfferingMedia, OfferingSchedule } from '../actions';
import { languages } from '@/lib/languages';
import { currencies } from '@/lib/currencies';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { Calendar, Clock, Tag, Globe, Package, Sparkles, Edit, Trash2, Repeat, MapPin } from 'lucide-react';
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
    onEdit: () => void;
    onDelete: () => void;
    isDeleting: boolean;
}

const languageNames = new Map(languages.map(l => [l.value, l.label]));

const DetailItem = ({ icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => {
    const Icon = icon;
    return (
        <div className="flex items-start gap-4">
            <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <div className="text-md text-foreground">{children}</div>
            </div>
        </div>
    );
};

export function OfferingDetailDialog({ isOpen, onOpenChange, offering, profile, onEdit, onDelete, isDeleting }: OfferingDetailDialogProps) {
    if (!offering) return null;
    
    const {
        title,
        description,
        type,
        contextual_notes,
        offering_media,
        offering_schedules,
    } = offering;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader className="mb-4 pr-12 relative">
                    <DialogTitle className="text-3xl">{title.primary}</DialogTitle>
                    <div className="flex items-center gap-2 pt-1 text-muted-foreground">
                        <Badge variant="secondary">{type}</Badge>
                    </div>
                    <div className="absolute top-0 right-0">
                         <Button variant="ghost" size="icon" onClick={onEdit}>
                            <Edit className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="max-h-[65vh] overflow-y-auto pr-6 space-y-6">
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
                    
                     {offering_schedules && offering_schedules.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                 <h3 className="font-semibold text-lg">{type === 'Event' ? 'Schedules & Pricing' : 'Pricing'}</h3>
                                <div className="space-y-4">
                                    {offering_schedules.map((schedule, index) => (
                                        <div key={schedule.id || index} className="p-4 border rounded-lg space-y-4">
                                            {type === 'Event' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                                                    {schedule.event_date && (
                                                        <DetailItem icon={Calendar} label="Date & Time">
                                                            {format(parseISO(schedule.event_date as unknown as string), 'PPP p')}
                                                        </DetailItem>
                                                    )}
                                                    {schedule.duration && (
                                                        <DetailItem icon={Clock} label="Duration">
                                                            {schedule.duration}
                                                        </DetailItem>
                                                    )}
                                                    {schedule.frequency && (
                                                        <DetailItem icon={Repeat} label="Frequency">
                                                            {schedule.frequency}
                                                        </DetailItem>
                                                    )}
                                                    {schedule.location_label && (
                                                        <DetailItem icon={MapPin} label="Location">
                                                            <div className="flex flex-col">
                                                                <span>{schedule.location_label}</span>
                                                                {schedule.location_address && <span className="text-sm text-muted-foreground">{schedule.location_address}</span>}
                                                                {schedule.location_gmaps_url && <a href={schedule.location_gmaps_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View on Map</a>}
                                                            </div>
                                                        </DetailItem>
                                                    )}
                                                </div>
                                            )}
                                            {schedule.prices && schedule.prices.length > 0 && (
                                                <>
                                                    {type === 'Event' && <Separator />}
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold">Pricing Tiers</h4>
                                                        {schedule.prices.map((price, pIndex) => (
                                                            <div key={pIndex} className="flex justify-between items-center text-sm">
                                                                <span>{price.label || 'Standard Price'}</span>
                                                                <span className="font-semibold">{new Intl.NumberFormat(profile?.primary_language || 'en-US', { style: 'currency', currency: price.currency || 'USD' }).format(price.price || 0)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                     )}

                    {contextual_notes && (
                        <>
                        <Separator />
                        <DetailItem icon={Sparkles} label="Contextual Notes for AI">
                            <p className="text-muted-foreground italic">"{contextual_notes}"</p>
                        </DetailItem>
                        </>
                    )}
                </div>
                 <DialogFooter className="pt-6 justify-center">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-1/2">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Offering
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this
                                    offering and all associated media.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

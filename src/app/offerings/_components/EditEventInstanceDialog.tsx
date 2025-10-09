
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateOfferingSchedule, deleteOfferingSchedule } from '../actions';
import type { Offering, OfferingSchedule, PricePoint } from '../actions';
import { Calendar as CalendarIcon, Clock, PlusCircle, Trash2, MapPin } from 'lucide-react';
import { currencies } from '@/lib/currencies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { value: time, label: format(new Date(2000, 0, 1, hours, minutes), 'p') };
});

interface EditEventInstanceDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offering: Offering | null;
    schedule: OfferingSchedule | null;
    onEventInstanceUpdated: () => void;
}

export function EditEventInstanceDialog({
    isOpen,
    onOpenChange,
    offering,
    schedule: scheduleToEdit,
    onEventInstanceUpdated
}: EditEventInstanceDialogProps) {
    const [schedule, setSchedule] = useState<Partial<OfferingSchedule>>({});
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        if (scheduleToEdit) {
            setSchedule({
                ...scheduleToEdit,
                event_date: scheduleToEdit.event_date ? parseISO(scheduleToEdit.event_date as unknown as string) : null,
            });
        }
    }, [scheduleToEdit, isOpen]);

    if (!offering || !scheduleToEdit) return null;

    const handleScheduleChange = (field: keyof Omit<OfferingSchedule, 'id' | 'prices'>, value: string | Date | null) => {
        setSchedule(prev => ({ ...prev, [field]: value }));
    };
    
    const handleTimeChange = (timeValue: string) => {
        const [hours, minutes] = timeValue.split(':').map(Number);
        const newDate = schedule.event_date ? new Date(schedule.event_date) : new Date();
        if (!isNaN(hours) && !isNaN(minutes)) {
            newDate.setHours(hours, minutes);
            setSchedule(prev => ({ ...prev, event_date: newDate }));
        }
    }

    const handlePriceChange = (priceIndex: number, field: keyof PricePoint, value: string | number | null) => {
        const newPrices = [...(schedule.prices || [])];
        (newPrices[priceIndex] as any)[field] = value;
        setSchedule(prev => ({ ...prev, prices: newPrices }));
    };

    const addPriceTier = () => {
        const newPrices = [...(schedule.prices || []), { price: null, label: '', currency: 'USD' }];
        setSchedule(prev => ({ ...prev, prices: newPrices }));
    };

    const removePriceTier = (priceIndex: number) => {
        const newPrices = (schedule.prices || []).filter((_, i) => i !== priceIndex);
        setSchedule(prev => ({ ...prev, prices: newPrices }));
    };

    const handleUpdate = async () => {
        if (!schedule.id) return;
        startSaving(async () => {
            try {
                await updateOfferingSchedule(schedule.id!, schedule);
                toast({ title: 'Success!', description: 'Event date updated.' });
                onEventInstanceUpdated();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Update failed', description: error.message });
            }
        });
    };
    
    const handleDelete = async () => {
        if (!schedule.id) return;
        startDeleting(async () => {
            try {
                await deleteOfferingSchedule(schedule.id!);
                toast({ title: 'Event Date Deleted', description: 'This specific event date has been removed.' });
                onEventInstanceUpdated();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Deletion failed', description: error.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Edit Event Instance</DialogTitle>
                    <DialogDescription>
                        Update details for this specific date of "{offering.title.primary}".
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Event Date</Label>
                            <Popover>
                                <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !schedule.event_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{schedule.event_date ? format(schedule.event_date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={schedule.event_date ?? undefined} onSelect={(date) => handleScheduleChange('event_date', date as Date)} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                         <div className="space-y-2">
                            <Label>Event Time</Label>
                            <Select value={schedule.event_date ? format(schedule.event_date, 'HH:mm') : ''} onValueChange={handleTimeChange}><SelectTrigger className="pl-10"><div className="absolute left-3 top-1/2 -translate-y-1/2"><Clock className="h-4 w-4 text-muted-foreground" /></div><SelectValue placeholder="Select time" /></SelectTrigger><SelectContent>{timeOptions.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input value={schedule.duration || ''} onChange={e => handleScheduleChange('duration', e.target.value)} placeholder="e.g., 2 hours" />
                    </div>

                     <div className="space-y-4">
                        <Label className="text-md font-semibold">Location</Label>
                        <div className="p-3 border rounded-lg space-y-3 bg-secondary/30">
                            <div className="space-y-2">
                                <Label>Location Label</Label>
                                <Input value={schedule.location_label || ''} onChange={e => handleScheduleChange('location_label', e.target.value)} placeholder="e.g., My Studio, Online" />
                            </div>
                             <div className="space-y-2">
                                <Label>Address</Label>
                                <Input value={schedule.location_address || ''} onChange={e => handleScheduleChange('location_address', e.target.value)} placeholder="e.g., 123 Main St, Anytown" />
                            </div>
                             <div className="space-y-2">
                                <Label>Google Maps URL</Label>
                                <Input value={schedule.location_gmaps_url || ''} onChange={e => handleScheduleChange('location_gmaps_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <h4 className="font-medium text-md">Pricing</h4>
                     <div className="space-y-3">
                        {(schedule.prices || []).map((price, priceIndex) => (
                            <div key={price.id || priceIndex} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-3 border bg-secondary/30 rounded-md relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removePriceTier(priceIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                <div className="space-y-2">
                                    <Label>Price Label</Label>
                                    <Input value={price.label || ''} onChange={e => handlePriceChange(priceIndex, 'label', e.target.value)} placeholder="e.g., Early Bird" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Price</Label>
                                    <Input type="number" value={price.price ?? ''} onChange={e => handlePriceChange(priceIndex, 'price', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 50.00" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <Select value={price.currency || 'USD'} onValueChange={v => handlePriceChange(priceIndex, 'currency', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{currencies.map(c=><SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>)}</SelectContent></Select>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addPriceTier}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Price Tier
                        </Button>
                    </div>
                </div>
                <DialogFooter className="justify-between">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete this Date'}</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete this specific event date. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

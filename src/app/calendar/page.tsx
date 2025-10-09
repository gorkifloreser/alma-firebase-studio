

'use client';

import React, { useEffect, useState, useMemo, useTransition, useCallback } from 'react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, endOfWeek, addMonths, subMonths, parseISO, isValid, setHours, setMinutes } from 'date-fns';
import { getContent, scheduleContent, type CalendarItem, getActiveSocialConnection, type SocialConnection } from './actions';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Mail, Instagram, MessageSquare, Sparkles, Pencil, Calendar as CalendarIcon, Globe, CheckCheck, AlertTriangle, Clock, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditContentDialog } from './_components/EditContentDialog';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { value: time, label: format(new Date(2000, 0, 1, hours, minutes), 'p') }; // Format to AM/PM
});

const ChannelIcon = ({ channel }: { channel: string | null | undefined }) => {
    if (!channel) return <Sparkles className="h-4 w-4 text-muted-foreground" />;
    
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes('instagram')) return <Instagram className="h-4 w-4 text-muted-foreground" />;
    if (lowerChannel.includes('facebook')) return <Instagram className="h-4 w-4 text-muted-foreground" />;
    if (lowerChannel.includes('webmail')) return <Mail className="h-4 w-4 text-muted-foreground" />;
    if (lowerChannel.includes('whatsapp') || lowerChannel.includes('telegram')) return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    if (lowerChannel.includes('website')) return <Globe className="h-4 w-4 text-muted-foreground" />;
    return <Sparkles className="h-4 w-4 text-muted-foreground" />;
}

const CalendarDay = ({ day, content, isCurrentMonth, onEventClick, heightClass }: { day: Date, content: CalendarItem[], isCurrentMonth: boolean, onEventClick: (item: CalendarItem) => void, heightClass: string }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: format(day, 'yyyy-MM-dd'),
        data: { type: 'calendarDay', date: day }
    });
    
    const [isToday, setIsToday] = useState(false);
    
    useEffect(() => {
        setIsToday(isSameDay(day, new Date()));
    }, [day]);

    return (
        <div 
            ref={setNodeRef}
            className={cn(
                "relative flex flex-col p-2 border-t border-l",
                heightClass,
                isCurrentMonth ? "bg-background" : "bg-muted/50",
                isOver ? "bg-accent" : "",
            )}
        >
            <time dateTime={format(day, 'yyyy-MM-dd')} className={cn("text-sm", isToday ? "font-bold text-primary" : "")}>
                {format(day, 'd')}
            </time>
             <div className="mt-1 flex-1 overflow-y-auto space-y-1">
                {content.map(item => <CalendarEvent key={item.id} item={item} onClick={() => onEventClick(item)} />)}
            </div>
        </div>
    );
};

const CalendarEvent = ({ item, onClick }: { item: CalendarItem, onClick: () => void }) => {
    const isDraggable = item.status === 'scheduled';
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: item.id,
        data: { type: 'calendarEvent' },
        disabled: !isDraggable,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
    } : undefined;

    const displayDate = item.published_at || item.scheduled_at;
    const publicationTime = displayDate ? format(parseISO(displayDate), 'p') : 'Unscheduled';

    const getStatusIcon = () => {
        switch (item.status) {
            case 'published': return <CheckCheck className="h-4 w-4 text-green-600" />;
            case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
            default: return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    }

    return (
        <div ref={setNodeRef} style={style} className="relative group/event">
             <Card className="overflow-hidden hover:shadow-md transition-shadow bg-secondary/30 relative">
                <div className="flex flex-col">
                     {item.image_url ? (
                        <div className="relative w-full aspect-video bg-muted">
                            <Image src={item.image_url} alt="thumbnail" layout="fill" className="object-cover" />
                        </div>
                     ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                            <ChannelIcon channel={item.user_channel_settings?.channel_name} />
                        </div>
                     )}
                     <div className="p-2 space-y-1">
                        <p className="text-xs font-bold truncate">{item.offerings?.title?.primary || item.concept}</p>
                        <div className="flex items-center justify-between mt-1">
                            <div className={cn("flex items-center gap-1.5")}>
                                {getStatusIcon()}
                                <span className="text-xs text-muted-foreground">{publicationTime}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick();
                                }}
                            >
                                <Pencil className="h-3 w-3"/>
                            </Button>
                        </div>
                     </div>
                </div>
            </Card>
             {isDraggable && (
                <div
                    {...listeners}
                    {...attributes}
                    className="absolute top-1/2 -left-2.5 -translate-y-1/2 p-1 cursor-grab opacity-0 group-hover/event:opacity-100 transition-opacity"
                >
                    <div className="w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center shadow">
                        <GripVertical className="h-4 w-4 text-primary-foreground" />
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CalendarPage() {
    const [contentItems, setContentItems] = useState<CalendarItem[]>([]);
    const [activeConnection, setActiveConnection] = useState<SocialConnection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScheduling, startScheduling] = useTransition();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'week' | 'month'>('week');
    const { toast } = useToast();

    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<CalendarItem | null>(null);

    const [isConfirmTimeOpen, setIsConfirmTimeOpen] = useState(false);
    const [itemToReschedule, setItemToReschedule] = useState<{itemId: string, newDate: Date} | null>(null);
    const [newTime, setNewTime] = useState('09:00');

    const handleEventClick = (item: CalendarItem) => {
        setEditingContent(item);
        setIsEditDialogOpen(true);
    };

    const handleContentUpdated = (updatedContent: CalendarItem) => {
        setContentItems(prev => prev.map(item => item.id === updatedContent.id ? updatedContent : item));
        setIsEditDialogOpen(false);
        toast({ title: "Content Updated!", description: "Your changes have been saved." });
    };

    const handleContentDeleted = (deletedItemId: string) => {
        setContentItems(prev => prev.filter(item => item.id !== deletedItemId));
    };

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        try {
            const [data, connection] = await Promise.all([
                getContent(),
                getActiveSocialConnection()
            ]);
            console.log('[page.tsx:fetchContent] Data received from server action:', data);
            setContentItems(data);
            setActiveConnection(connection);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) redirect('/login');
            
            fetchContent();
        };

        checkUserAndFetchData();
    }, [fetchContent]);

    const scheduledOrPublished = useMemo(() => {
        return contentItems.filter(item => (item.status === 'scheduled' || item.status === 'published' || item.status === 'failed') && (item.published_at || item.scheduled_at));
    }, [contentItems]);

    const { calendarDays, headerLabel } = useMemo(() => {
        if (view === 'month') {
            const firstDayOfMonth = startOfMonth(currentDate);
            const lastDayOfMonth = endOfMonth(currentDate);
            const firstDayOfCalendar = startOfWeek(firstDayOfMonth);
            const lastDayOfCalendar = endOfWeek(lastDayOfMonth);
            return {
                calendarDays: eachDayOfInterval({ start: firstDayOfCalendar, end: lastDayOfCalendar }),
                headerLabel: format(currentDate, 'MMMM yyyy'),
            };
        } else { // week view
            const firstDayOfWeek = startOfWeek(currentDate);
            return {
                calendarDays: eachDayOfInterval({ start: firstDayOfWeek, end: addDays(firstDayOfWeek, 6) }),
                headerLabel: `${format(firstDayOfWeek, 'MMM d')} - ${format(addDays(firstDayOfWeek, 6), 'MMM d, yyyy')}`,
            };
        }
    }, [currentDate, view]);

    const handlePrev = () => {
        if (view === 'month') {
            setCurrentDate(subMonths(currentDate, 1));
        } else {
            setCurrentDate(addDays(currentDate, -7));
        }
    };
    const handleNext = () => {
         if (view === 'month') {
            setCurrentDate(addMonths(currentDate, 1));
        } else {
            setCurrentDate(addDays(currentDate, 7));
        }
    };

     const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setCurrentDate(date);
            setIsDatePickerOpen(false);
        }
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const contentId = active.id as string;
        const targetId = over.id as string;
        const sourceType = active.data.current?.type;
        const targetType = over.data.current?.type;

        if (sourceType === 'calendarEvent' && targetType === 'calendarDay') {
             const targetDate = over.data.current?.date as Date;
             
             const originalItem = contentItems.find(item => item.id === contentId);
             if (originalItem && originalItem.scheduled_at && isSameDay(new Date(originalItem.scheduled_at), targetDate)) {
                 return; 
             }
             
             if (originalItem?.status === 'published') {
                 toast({ variant: 'destructive', title: 'Cannot Move Published Post', description: 'Once a post is published, its date cannot be changed.' });
                 return;
             }

             // Open confirmation dialog instead of scheduling directly
             setItemToReschedule({ itemId: contentId, newDate: targetDate });
             // Pre-fill with original time if available
             const originalTime = originalItem?.scheduled_at ? format(parseISO(originalItem.scheduled_at), 'HH:mm') : '09:00';
             setNewTime(originalTime);
             setIsConfirmTimeOpen(true);
        }
    };

     const handleConfirmReschedule = () => {
        if (!itemToReschedule) return;

        const { itemId, newDate } = itemToReschedule;
        const [hours, minutes] = newTime.split(':').map(Number);
        const finalDate = setHours(setMinutes(newDate, minutes), hours);
        
        startScheduling(async () => {
            try {
                await scheduleContent(itemId, finalDate);
                setContentItems(prev => prev.map(item => 
                    item.id === itemId 
                    ? { ...item, status: 'scheduled', scheduled_at: finalDate.toISOString() } 
                    : item
                ));
                toast({ title: "Content Rescheduled!", description: "The item's date and time have been updated." });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Rescheduling Failed', description: error.message });
            } finally {
                setIsConfirmTimeOpen(false);
                setItemToReschedule(null);
            }
        });
    };

    const dayHeightClass = view === 'week' ? 'h-[48rem]' : 'h-48';

    return (
        <DashboardLayout>
            <DndContext onDragEnd={handleDragEnd}>
                <Toaster />
                 <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                    <Card className="flex-1 flex flex-col">
                        <CardHeader className="flex items-center justify-between flex-row">
                             <CardTitle className="text-2xl font-bold">{headerLabel}</CardTitle>
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                                    <Button variant={view === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('week')}>Week</Button>
                                    <Button variant={view === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('month')}>Month</Button>
                                </div>
                                 <div className="flex items-center gap-2">
                                     <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft /></Button>
                                     <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                <span>Go to date</span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={currentDate}
                                                onSelect={handleDateSelect}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight /></Button>
                                </div>
                             </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col p-0">
                            <div className="grid grid-cols-7 border-b">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="p-2 text-center font-medium text-sm border-l">{day}</div>
                                ))}
                            </div>
                             <div className="grid grid-cols-7 flex-1">
                                {isLoading ? (
                                    Array.from({ length: view === 'week' ? 7 : 35 }).map((_, i) => (
                                         <div key={i} className={cn("relative flex flex-col p-2 border-t border-l", dayHeightClass)}>
                                            <Skeleton className="h-5 w-5 mb-2" />
                                            <Skeleton className="h-20 w-full" />
                                         </div>
                                    ))
                                ) : (
                                    calendarDays.map(day => {
                                        const dayContent = scheduledOrPublished.filter(item => {
                                            const displayDate = item.published_at || item.scheduled_at;
                                            return displayDate && isSameDay(parseISO(displayDate), day);
                                        });
                                        return (
                                            <CalendarDay 
                                                key={day.toString()} 
                                                day={day}
                                                content={dayContent}
                                                isCurrentMonth={isSameMonth(day, currentDate)}
                                                onEventClick={handleEventClick}
                                                heightClass={dayHeightClass}
                                            />
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DndContext>
            <Dialog open={isConfirmTimeOpen} onOpenChange={setIsConfirmTimeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm New Time</DialogTitle>
                        <DialogDescription>
                            You moved this event to {itemToReschedule?.newDate ? format(itemToReschedule.newDate, 'PPP') : ''}. Please select a time.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="py-4">
                        <Select value={newTime} onValueChange={setNewTime}>
                            <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Select a time" />
                                </div>
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmTimeOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmReschedule} disabled={isScheduling}>
                            {isScheduling ? 'Saving...' : 'Confirm and Reschedule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             {editingContent && (
                <EditContentDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    contentItem={editingContent}
                    onContentUpdated={handleContentUpdated}
                    onContentDeleted={handleContentDeleted}
                    activeConnection={activeConnection}
                />
            )}
        </DashboardLayout>
    );
}

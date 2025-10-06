

'use client';

import React, { useEffect, useState, useMemo, useTransition } from 'react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, endOfWeek, addMonths, subMonths, subDays } from 'date-fns';
import { getContent, scheduleContent, unscheduleContent, type CalendarItem } from './actions';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, GripVertical, Mail, Instagram, MessageSquare, Sparkles, Pencil, Calendar as CalendarIcon, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditContentDialog } from './_components/EditContentDialog';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


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

const DraggableContent = ({ item }: { item: CalendarItem }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: item.id,
        data: { type: 'contentItem' }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <Card ref={setNodeRef} style={style} {...attributes} className="p-3 mb-2 bg-card touch-none">
            <div className="flex items-start gap-2">
                <div {...listeners} className="cursor-grab p-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-2">{item.content_body?.primary || 'Untitled Content'}</p>
                    <div className="flex items-center gap-2 mt-1">
                         <ChannelIcon channel={item.user_channel_settings?.channel_name} />
                        <p className="text-xs text-muted-foreground">{item.format || 'Content'}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const CalendarDay = ({ day, content, isCurrentMonth, onEventClick, heightClass }: { day: Date, content: CalendarItem[], isCurrentMonth: boolean, onEventClick: (item: CalendarItem) => void, heightClass: string }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: format(day, 'yyyy-MM-dd'),
        data: { type: 'calendarDay', date: day }
    });

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
            <time dateTime={format(day, 'yyyy-MM-dd')} className={cn("text-sm", isSameDay(day, new Date()) ? "font-bold text-primary" : "")}>
                {format(day, 'd')}
            </time>
             <div className="mt-1 flex-1 overflow-y-auto space-y-1">
                {content.map(item => <CalendarEvent key={item.id} item={item} onClick={() => onEventClick(item)} />)}
            </div>
        </div>
    );
};

const CalendarEvent = ({ item, onClick }: { item: CalendarItem, onClick: () => void }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: item.id,
        data: { type: 'calendarEvent' }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
             <Card className="p-2 bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="flex flex-col gap-2">
                     {item.image_url && (
                        <div className="relative w-full aspect-square">
                            <Image src={item.image_url} alt="thumbnail" layout="fill" className="rounded-sm object-cover" />
                        </div>
                     )}
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.content_body?.primary || 'Untitled'}</p>
                        <div className="flex items-center justify-between mt-1">
                            <div {...listeners} className="flex items-center gap-1 cursor-grab">
                                <ChannelIcon channel={item.user_channel_settings?.channel_name} />
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
        </div>
    )
}

export default function CalendarPage() {
    const [contentItems, setContentItems] = useState<CalendarItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScheduling, startScheduling] = useTransition();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'week' | 'month'>('week');
    const { toast } = useToast();

    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<CalendarItem | null>(null);

    const handleEventClick = (item: CalendarItem) => {
        setEditingContent(item);
        setIsEditDialogOpen(true);
    };

    const handleContentUpdated = (updatedContent: CalendarItem) => {
        setContentItems(prev => prev.map(item => item.id === updatedContent.id ? updatedContent : item));
        setIsEditDialogOpen(false);
        toast({ title: "Content Updated!", description: "Your changes have been saved." });
    };

    const fetchContent = async () => {
        setIsLoading(true);
        try {
            const data = await getContent();
            setContentItems(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) redirect('/login');
            
            fetchContent();
        };

        checkUserAndFetchData();
    }, [toast, fetchContent]);

    const { unscheduled, scheduled } = useMemo(() => {
        const unscheduled = contentItems.filter(item => item.status === 'approved');
        const scheduled = contentItems.filter(item => item.status === 'scheduled' && item.scheduled_at);
        return { unscheduled, scheduled };
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
            const lastDayOfWeek = endOfWeek(currentDate);
            return {
                calendarDays: eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek }),
                headerLabel: `${format(firstDayOfWeek, 'MMM d')} - ${format(lastDayOfWeek, 'MMM d, yyyy')}`,
            };
        }
    }, [currentDate, view]);

    const handlePrev = () => {
        if (view === 'month') {
            setCurrentDate(subMonths(currentDate, 1));
        } else {
            setCurrentDate(subDays(currentDate, 7));
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

        // From unscheduled to calendar
        if (sourceType === 'contentItem' && targetType === 'calendarDay') {
            const targetDate = over.data.current?.date as Date;
            
            startScheduling(async () => {
                try {
                    await scheduleContent(contentId, targetDate);
                    // Optimistic update
                    setContentItems(prev => prev.map(item => 
                        item.id === contentId 
                        ? { ...item, status: 'scheduled', scheduled_at: targetDate.toISOString() } 
                        : item
                    ));
                    toast({ title: "Content Scheduled!", description: "The item has been placed on your calendar." });
                } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Scheduling Failed', description: error.message });
                }
            });
        } 
        // From calendar back to unscheduled
        else if (sourceType === 'calendarEvent' && targetType === 'unscheduledArea') {
            startScheduling(async () => {
                try {
                    await unscheduleContent(contentId);
                    setContentItems(prev => prev.map(item => 
                        item.id === contentId 
                        ? { ...item, status: 'approved', scheduled_at: null } 
                        : item
                    ));
                    toast({ title: "Content Unscheduled", description: "The item has been returned to the 'Approved' list." });
                } catch (error: any) {
                     toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
                }
            });
        }
        // From calendar to another day on the calendar (rescheduling)
        else if (sourceType === 'calendarEvent' && targetType === 'calendarDay') {
             const targetDate = over.data.current?.date as Date;
             
             const originalItem = contentItems.find(item => item.id === contentId);
             if (originalItem && originalItem.scheduled_at && isSameDay(new Date(originalItem.scheduled_at), targetDate)) {
                 return; 
             }

             startScheduling(async () => {
                try {
                    await scheduleContent(contentId, targetDate);
                    setContentItems(prev => prev.map(item => 
                        item.id === contentId 
                        ? { ...item, status: 'scheduled', scheduled_at: targetDate.toISOString() } 
                        : item
                    ));
                    toast({ title: "Content Rescheduled!", description: "The item's date has been updated." });
                } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Rescheduling Failed', description: error.message });
                }
            });
        }
    };
    
    const { setNodeRef: unscheduledAreaRef, isOver: isOverUnscheduled } = useDroppable({
        id: 'unscheduledArea',
        data: { type: 'unscheduledArea' }
    });

    const dayHeightClass = view === 'week' ? 'h-[48rem]' : 'h-48';

    return (
        <DashboardLayout>
            <DndContext onDragEnd={handleDragEnd}>
                <Toaster />
                <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
                    <aside ref={unscheduledAreaRef} className={cn("w-full lg:w-80 border-r p-4 overflow-y-auto", isOverUnscheduled ? "bg-destructive/10" : "")}>
                        <h2 className="text-xl font-bold mb-4">Approved Content</h2>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : unscheduled.length > 0 ? (
                            unscheduled.map(item => <DraggableContent key={item.id} item={item} />)
                        ) : (
                            <div className="text-center text-muted-foreground mt-10">
                                <p>No unscheduled content.</p>
                                <p className="text-sm">Approve content from the Artisan to see it here.</p>
                            </div>
                        )}
                        {isOverUnscheduled && <div className="text-center p-4 text-destructive font-bold">Return to Unscheduled</div>}
                    </aside>

                    <main className="flex-1 flex flex-col">
                        <header className="flex items-center justify-between p-4 border-b">
                             <h1 className="text-2xl font-bold">{headerLabel}</h1>
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
                        </header>
                         <div className="flex-1 flex flex-col">
                            <div className="grid grid-cols-7 border-b">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="p-2 text-center font-medium text-sm border-l">{day}</div>
                                ))}
                            </div>
                             <div className="grid grid-cols-7 flex-1 border-b">
                                {calendarDays.map(day => {
                                    const dayContent = scheduled.filter(item => item.scheduled_at && isSameDay(new Date(item.scheduled_at), day));
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
                                })}
                            </div>
                        </div>
                    </main>
                </div>
            </DndContext>
             {editingContent && (
                <EditContentDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    contentItem={editingContent}
                    onContentUpdated={handleContentUpdated}
                />
            )}
        </DashboardLayout>
    );
}

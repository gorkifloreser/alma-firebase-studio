
'use client';

import React, { useEffect, useState, useMemo, useTransition } from 'react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, endOfWeek } from 'date-fns';
import { getContent, scheduleContent, unscheduleContent, type ContentItem } from './actions';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, GripVertical, Mail, Instagram, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


const ChannelIcon = ({ channel }: { channel: string | null | undefined }) => {
    if (!channel) return <Sparkles className="h-4 w-4 text-muted-foreground" />;
    
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes('social')) return <Instagram className="h-4 w-4 text-muted-foreground" />;
    if (lowerChannel.includes('email')) return <Mail className="h-4 w-4 text-muted-foreground" />;
    if (lowerChannel.includes('whatsapp')) return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    return <Sparkles className="h-4 w-4 text-muted-foreground" />;
}

const DraggableContent = ({ item }: { item: ContentItem }) => {
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
                         <ChannelIcon channel={item.source_plan?.channel} />
                        <p className="text-xs text-muted-foreground">{item.source_plan?.format || 'Content'}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const CalendarDay = ({ day, content, isCurrentMonth }: { day: Date, content: ContentItem[], isCurrentMonth: boolean }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: format(day, 'yyyy-MM-dd'),
        data: { type: 'calendarDay', date: day }
    });

    return (
        <div 
            ref={setNodeRef}
            className={cn(
                "relative flex flex-col h-32 p-2 border-t border-l",
                isCurrentMonth ? "bg-background" : "bg-muted/50",
                isOver ? "bg-accent" : "",
            )}
        >
            <time dateTime={format(day, 'yyyy-MM-dd')} className={cn("text-sm", isSameDay(day, new Date()) ? "font-bold text-primary" : "")}>
                {format(day, 'd')}
            </time>
             <div className="mt-1 flex-1 overflow-y-auto">
                {content.map(item => <CalendarEvent key={item.id} item={item} />)}
            </div>
        </div>
    );
};

const CalendarEvent = ({ item }: { item: ContentItem }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: item.id,
        data: { type: 'calendarEvent' }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative mb-1">
            <Badge variant="secondary" className="w-full justify-start text-left whitespace-normal h-auto cursor-grab">
                 <div className="flex items-center gap-1">
                    <ChannelIcon channel={item.source_plan?.channel} />
                    <span className="truncate">{item.content_body?.primary || 'Untitled'}</span>
                </div>
            </Badge>
        </div>
    )
}

export default function CalendarPage() {
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScheduling, startScheduling] = useTransition();
    const [currentDate, setCurrentDate] = useState(new Date());
    const { toast } = useToast();

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) redirect('/login');
            
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

        checkUserAndFetchData();
    }, [toast]);

    const { unscheduled, scheduled } = useMemo(() => {
        const unscheduled = contentItems.filter(item => item.status === 'approved');
        const scheduled = contentItems.filter(item => item.status === 'scheduled' && item.scheduled_at);
        return { unscheduled, scheduled };
    }, [contentItems]);

    const firstDayOfMonth = startOfMonth(currentDate);
    const lastDayOfMonth = endOfMonth(currentDate);
    const firstDayOfCalendar = startOfWeek(firstDayOfMonth);
    const lastDayOfCalendar = endOfWeek(lastDayOfMonth);
    const calendarDays = eachDayOfInterval({ start: firstDayOfCalendar, end: lastDayOfCalendar });
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const contentId = active.id as string;
        const targetId = over.id as string;
        const sourceType = active.data.current?.type;

        if (sourceType === 'contentItem' && over.data.current?.type === 'calendarDay') {
            const targetDate = over.data.current.date as Date;
            
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
        } else if (sourceType === 'calendarEvent' && over.data.current?.type === 'unscheduledArea') {
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
    };
    
    const { setNodeRef: unscheduledAreaRef, isOver: isOverUnscheduled } = useDroppable({
        id: 'unscheduledArea',
        data: { type: 'unscheduledArea' }
    });

    return (
        <DashboardLayout>
            <DndContext onDragEnd={handleDragEnd}>
                <Toaster />
                <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
                    {/* Sidebar for Unscheduled Content */}
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
                                <p className="text-sm">Approve content from the Offerings or Media Plan page to see it here.</p>
                            </div>
                        )}
                        {isOverUnscheduled && <div className="text-center p-4 text-destructive font-bold">Return to Unscheduled</div>}
                    </aside>

                    {/* Main Calendar View */}
                    <main className="flex-1 flex flex-col">
                        <header className="flex items-center justify-between p-4 border-b">
                             <h1 className="text-2xl font-bold">{format(currentDate, 'MMMM yyyy')}</h1>
                             <div className="flex items-center gap-2">
                                 <Button variant="outline" size="icon" onClick={() => setCurrentDate(prev => addDays(prev, -30))}><ChevronLeft /></Button>
                                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentDate(prev => addDays(prev, 30))}><ChevronRight /></Button>
                            </div>
                        </header>
                         <div className="grid grid-cols-7 flex-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="p-2 text-center font-medium text-sm border-l">{day}</div>
                            ))}
                            {calendarDays.map(day => {
                                const dayContent = scheduled.filter(item => isSameDay(new Date(item.scheduled_at!), day));
                                return (
                                    <CalendarDay 
                                        key={day.toString()} 
                                        day={day}
                                        content={dayContent}
                                        isCurrentMonth={isSameMonth(day, currentDate)}
                                    />
                                );
                            })}
                        </div>
                    </main>
                </div>
            </DndContext>
        </DashboardLayout>
    );
}

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, endOfWeek, addMonths, subMonths, parseISO, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Package, Clock, PlusCircle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Image from 'next/image';
import type { Offering, OfferingMedia, OfferingSchedule } from '../actions';
import { useDraggable, useDroppable } from '@dnd-kit/core';

type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

interface EventCalendarViewProps {
    events: OfferingWithMedia[];
    onEventClick: (offeringId: string, scheduleId: string) => void;
    onAddEvent: (date: Date) => void;
}

const CalendarDay = ({ day, events, isCurrentMonth, onEventClick, onAddEvent }: { day: Date, events: { offering: OfferingWithMedia, schedule: OfferingSchedule }[], isCurrentMonth: boolean, onEventClick: (offeringId: string, scheduleId: string) => void, onAddEvent: (date: Date) => void }) => {
    const [isToday, setIsToday] = useState(false);
    
    useEffect(() => {
        setIsToday(isSameDay(day, new Date()));
    }, [day]);
    
    const { isOver, setNodeRef } = useDroppable({
        id: format(day, 'yyyy-MM-dd'),
        data: { type: 'calendarDay', date: day }
    });

    return (
        <div 
            ref={setNodeRef}
            className={cn(
                "relative flex flex-col p-2 border-t border-l min-h-[160px] group",
                isCurrentMonth ? "bg-background" : "bg-muted/50",
                isOver ? "bg-accent" : "",
            )}
        >
            <time dateTime={format(day, 'yyyy-MM-dd')} className={cn("text-sm", isToday ? "font-bold text-primary" : "")}>
                {format(day, 'd')}
            </time>
             <div className="mt-1 flex-1 overflow-y-auto space-y-1">
                {events.map(({ offering, schedule }) => <CalendarEvent key={`${offering.id}-${schedule.id}`} offering={offering} schedule={schedule} onClick={() => onEventClick(offering.id, schedule.id!)} />)}
            </div>
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onAddEvent(day)}
            >
                <PlusCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
        </div>
    );
};

const CalendarEvent = ({ offering, schedule, onClick }: { offering: OfferingWithMedia, schedule: OfferingSchedule, onClick: () => void }) => {
    const eventTime = schedule?.event_date && isValid(parseISO(schedule.event_date as any)) ? format(parseISO(schedule.event_date as any), 'p') : 'All day';
    const coverImage = offering.offering_media?.[0]?.media_url;

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: schedule.id!,
        data: { type: 'calendarEvent', schedule: schedule },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} className="relative group/event">
             <Card 
                className="overflow-hidden hover:shadow-md transition-shadow bg-secondary/30 relative cursor-pointer"
                onClick={onClick}
            >
                <div className="flex flex-col">
                     {coverImage ? (
                        <div className="relative w-full aspect-video bg-muted">
                            <Image src={coverImage} alt={offering.title.primary || 'Event image'} layout="fill" className="object-cover" />
                        </div>
                     ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                             <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                     )}
                     <div className="p-2 space-y-1">
                        <p className="text-xs font-bold truncate group-hover:text-primary">{offering.title.primary}</p>
                        <div className="flex items-center justify-between mt-1">
                            <div className={cn("flex items-center gap-1.5")}>
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{eventTime}</span>
                            </div>
                        </div>
                     </div>
                </div>
            </Card>
            <div 
                {...listeners} 
                {...attributes}
                className="absolute top-1/2 -left-2 -translate-y-1/2 p-1 cursor-grab opacity-0 group-hover/event:opacity-100 transition-opacity"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
        </div>
    )
}

export function EventCalendarView({ events, onEventClick, onAddEvent }: EventCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    
    const { calendarDays, headerLabel } = useMemo(() => {
        const firstDayOfMonth = startOfMonth(currentDate);
        const lastDayOfMonth = endOfMonth(currentDate);
        const firstDayOfCalendar = startOfWeek(firstDayOfMonth);
        const lastDayOfCalendar = endOfWeek(lastDayOfMonth);
        return {
            calendarDays: eachDayOfInterval({ start: firstDayOfCalendar, end: lastDayOfCalendar }),
            headerLabel: format(currentDate, 'MMMM yyyy'),
        };
    }, [currentDate]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, { offering: OfferingWithMedia, schedule: OfferingSchedule }[]>();
        events.forEach(event => {
            event.offering_schedules?.forEach(schedule => {
                if (schedule.event_date && schedule.id) {
                    const date = parseISO(schedule.event_date as unknown as string);
                    if (isValid(date)) {
                        const dateKey = format(date, 'yyyy-MM-dd');
                        const dayEvents = map.get(dateKey) || [];
                        map.set(dateKey, [...dayEvents, { offering: event, schedule }]);
                    }
                }
            });
        });
        return map;
    }, [events]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setCurrentDate(date);
            setIsDatePickerOpen(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex items-center justify-between flex-row">
                 <CardTitle className="text-2xl font-bold">{headerLabel}</CardTitle>
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                         <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft /></Button>
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
                        <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight /></Button>
                    </div>
                 </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-7 border-b">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-2 text-center font-medium text-sm border-l">{day}</div>
                    ))}
                </div>
                 <div className="grid grid-cols-7">
                    {calendarDays.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayEvents = eventsByDate.get(dayKey) || [];
                        return (
                            <CalendarDay 
                                key={day.toString()} 
                                day={day}
                                events={dayEvents}
                                isCurrentMonth={isSameMonth(day, currentDate)}
                                onEventClick={onEventClick}
                                onAddEvent={onAddEvent}
                            />
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
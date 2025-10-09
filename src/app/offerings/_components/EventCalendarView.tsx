
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, endOfWeek, addMonths, subMonths, parseISO, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Image from 'next/image';
import type { Offering, OfferingMedia } from '../actions';

type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

interface EventCalendarViewProps {
    events: OfferingWithMedia[];
    onEventClick: (event: OfferingWithMedia) => void;
}

const CalendarDay = ({ day, events, isCurrentMonth, onEventClick }: { day: Date, events: OfferingWithMedia[], isCurrentMonth: boolean, onEventClick: (event: OfferingWithMedia) => void }) => {
    const [isToday, setIsToday] = useState(false);
    
    useEffect(() => {
        setIsToday(isSameDay(day, new Date()));
    }, [day]);

    return (
        <div 
            className={cn(
                "relative flex flex-col p-2 border-t border-l min-h-[160px]",
                isCurrentMonth ? "bg-background" : "bg-muted/50",
            )}
        >
            <time dateTime={format(day, 'yyyy-MM-dd')} className={cn("text-sm", isToday ? "font-bold text-primary" : "")}>
                {format(day, 'd')}
            </time>
             <div className="mt-1 flex-1 overflow-y-auto space-y-1">
                {events.map(event => <CalendarEvent key={event.id} event={event} onClick={() => onEventClick(event)} />)}
            </div>
        </div>
    );
};

const CalendarEvent = ({ event, onClick }: { event: OfferingWithMedia, onClick: () => void }) => {
    const firstSchedule = event.offering_schedules?.[0];
    const eventTime = firstSchedule?.event_date && isValid(parseISO(firstSchedule.event_date as any)) ? format(parseISO(firstSchedule.event_date as any), 'p') : 'All day';
    const coverImage = event.offering_media?.[0]?.media_url;

    return (
        <div onClick={onClick}>
             <Card className="overflow-hidden hover:shadow-md transition-shadow bg-secondary/30 relative group cursor-pointer">
                <div className="flex flex-col">
                     {coverImage ? (
                        <div className="relative w-full aspect-video bg-muted">
                            <Image src={coverImage} alt={event.title.primary || 'Event image'} layout="fill" className="object-cover" />
                        </div>
                     ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                             <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                     )}
                     <div className="p-2 space-y-1">
                        <p className="text-xs font-bold truncate group-hover:text-primary">{event.title.primary}</p>
                        <div className="flex items-center justify-between mt-1">
                            <div className={cn("flex items-center gap-1.5")}>
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{eventTime}</span>
                            </div>
                        </div>
                     </div>
                </div>
            </Card>
        </div>
    )
}

export function EventCalendarView({ events, onEventClick }: EventCalendarViewProps) {
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
        const map = new Map<string, OfferingWithMedia[]>();
        events.forEach(event => {
            event.offering_schedules?.forEach(schedule => {
                if (schedule.event_date) {
                    const date = parseISO(schedule.event_date as unknown as string);
                    if (isValid(date)) {
                        const dateKey = format(date, 'yyyy-MM-dd');
                        const dayEvents = map.get(dateKey) || [];
                        // Avoid adding duplicates if an offering has multiple schedules on the same day
                        if (!dayEvents.some(e => e.id === event.id)) {
                           map.set(dateKey, [...dayEvents, event]);
                        }
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
                            />
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

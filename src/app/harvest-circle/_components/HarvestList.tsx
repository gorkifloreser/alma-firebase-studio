
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Send, Package, CheckCircle, Award } from 'lucide-react';
import type { HarvestItem, updateHarvestItemStatus, requestTestimonial } from '../actions';

interface HarvestListProps {
  initialItems: HarvestItem[];
  actions: {
    updateHarvestItemStatus: typeof updateHarvestItemStatus;
    requestTestimonial: typeof requestTestimonial;
  };
  onDataChange: () => void;
}

export function HarvestList({ initialItems, actions, onDataChange }: HarvestListProps) {
    console.log('[HarvestList] Component rendering. Received initial items:', initialItems.length);
    const [items, setItems] = useState(initialItems);
    const [isUpdating, startUpdating] = useTransition();
    const [isRequesting, startRequesting] = useTransition();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const handleStatusChange = (itemId: string, newStatus: 'to_deliver' | 'in_progress' | 'completed') => {
        console.log(`[HarvestList] handleStatusChange triggered for item ${itemId} to status ${newStatus}.`);
        startUpdating(async () => {
            try {
                await actions.updateHarvestItemStatus(itemId, newStatus);
                toast({ title: 'Status Updated!', description: 'The delivery status has been changed.' });
                onDataChange(); // Refresh data from parent
            } catch (error: any) {
                console.error(`[HarvestList] Error updating status for item ${itemId}:`, error);
                toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
            }
        });
    };

    const handleRequestTestimonial = (itemId: string) => {
        console.log(`[HarvestList] handleRequestTestimonial triggered for item ${itemId}.`);
        startRequesting(async () => {
            try {
                await actions.requestTestimonial(itemId);
                toast({ title: 'Request Sent!', description: 'A testimonial request has been sent to the customer.' });
            } catch (error: any) {
                console.error(`[HarvestList] Error requesting testimonial for item ${itemId}:`, error);
                toast({ variant: 'destructive', title: 'Request Failed', description: error.message });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Offering Delivery Status</CardTitle>
                <CardDescription>Track and manage the post-sale process for your offerings.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {items.length > 0 ? (
                        items.map(item => (
                            <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                                <div className="flex-1">
                                    <p className="font-semibold">{item.offerings.title.primary}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Sale Date: {isClient ? format(new Date(item.created_at), 'PPP') : '...'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Select
                                        value={item.status}
                                        onValueChange={(value) => handleStatusChange(item.id, value as any)}
                                        disabled={isUpdating}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Set status..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="to_deliver"><Package className="mr-2 h-4 w-4"/>To Deliver</SelectItem>
                                            <SelectItem value="in_progress"><Award className="mr-2 h-4 w-4"/>In Progress</SelectItem>
                                            <SelectItem value="completed"><CheckCircle className="mr-2 h-4 w-4"/>Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRequestTestimonial(item.id)}
                                        disabled={isRequesting || item.status !== 'completed'}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        Request Testimonial
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center">No delivery items to display yet.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

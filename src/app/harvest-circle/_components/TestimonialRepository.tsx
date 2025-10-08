
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PlusCircle, Sparkles, Star, MessageSquareQuote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { Testimonial, saveTestimonial, createContentFromTestimonial } from '../actions';
import type { Offering } from '@/app/offerings/actions';

interface TestimonialRepositoryProps {
  initialTestimonials: Testimonial[];
  offerings: Offering[];
  actions: {
    saveTestimonial: typeof saveTestimonial;
    createContentFromTestimonial: typeof createContentFromTestimonial;
  };
  onDataChange: () => void;
}

export function TestimonialRepository({ initialTestimonials, offerings, actions, onDataChange }: TestimonialRepositoryProps) {
    console.log('[TestimonialRepository] Component rendering. Received initial testimonials:', initialTestimonials.length);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newTestimonial, setNewTestimonial] = useState<Partial<Testimonial>>({});
    const [isSaving, startSaving] = useTransition();
    const [isGenerating, startGenerating] = useTransition();
    const { toast } = useToast();

    // Fetch offerings when dialog opens
    const handleOpenDialog = async () => {
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        console.log('[TestimonialRepository] handleSave triggered. Testimonial data:', newTestimonial);
        if (!newTestimonial.offering_id || !newTestimonial.customer_name || !newTestimonial.testimonial_text) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all fields.' });
            return;
        }

        startSaving(async () => {
            try {
                await actions.saveTestimonial(newTestimonial as Testimonial);
                toast({ title: 'Testimonial Saved!', description: 'The new testimonial has been added to your repository.' });
                setNewTestimonial({});
                setIsDialogOpen(false);
                onDataChange();
            } catch (error: any) {
                console.error('[TestimonialRepository] Error saving testimonial:', error);
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };
    
    const handleCreateContent = (testimonialId: string, testimonialText: string) => {
        console.log(`[TestimonialRepository] handleCreateContent triggered for testimonial ${testimonialId}.`);
        startGenerating(async () => {
             try {
                const result = await actions.createContentFromTestimonial(testimonialId, testimonialText);
                toast({ title: 'Content Created!', description: 'A new social media post draft has been created in your Artisan queue.' });
            } catch (error: any) {
                console.error(`[TestimonialRepository] Error creating content from testimonial ${testimonialId}:`, error);
                toast({ variant: 'destructive', title: 'Content Creation Failed', description: error.message });
            }
        });
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Testimonial Repository</CardTitle>
                        <CardDescription>View, add, and reuse customer testimonials.</CardDescription>
                    </div>
                    <Button onClick={handleOpenDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Testimonial</Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {initialTestimonials.length > 0 ? (
                            initialTestimonials.map(testimonial => (
                                <Card key={testimonial.id} className="bg-muted/50">
                                    <CardContent className="p-6">
                                        <blockquote className="border-l-2 pl-6 italic">
                                            "{testimonial.testimonial_text}"
                                        </blockquote>
                                        <p className="mt-4 text-right font-semibold text-sm">
                                            - {testimonial.customer_name}, on {testimonial.offerings?.title?.primary || 'an offering'}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex justify-end">
                                        <Button
                                            size="sm"
                                            onClick={() => handleCreateContent(testimonial.id, testimonial.testimonial_text)}
                                            disabled={isGenerating}
                                        >
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Create Social Post
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))
                        ) : (
                             <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                <MessageSquareQuote className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="text-xl font-semibold mt-4">No Testimonials Yet</h3>
                                <p className="text-muted-foreground mt-2">
                                   Request testimonials or add your first one manually.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Testimonial</DialogTitle>
                        <DialogDescription>Manually add a customer testimonial to your repository.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="offering_id">Related Offering</Label>
                            <Select onValueChange={value => setNewTestimonial(p => ({ ...p, offering_id: value }))}>
                                <SelectTrigger><SelectValue placeholder="Select an offering..." /></SelectTrigger>
                                <SelectContent>
                                    {offerings.map(offering => (
                                        <SelectItem key={offering.id} value={offering.id}>
                                            {offering.title.primary}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer_name">Customer Name</Label>
                            <Input id="customer_name" value={newTestimonial.customer_name || ''} onChange={e => setNewTestimonial(p => ({ ...p, customer_name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="testimonial_text">Testimonial Text</Label>
                            <Textarea id="testimonial_text" value={newTestimonial.testimonial_text || ''} onChange={e => setNewTestimonial(p => ({ ...p, testimonial_text: e.target.value }))} rows={5} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Testimonial'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

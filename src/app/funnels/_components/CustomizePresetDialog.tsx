
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { saveCustomFunnelPreset } from '../actions';
import type { FunnelPreset } from '../actions';

interface CustomizePresetDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    presetToClone: FunnelPreset | null;
    onPresetSaved: () => void;
}

export function CustomizePresetDialog({
    isOpen,
    onOpenChange,
    presetToClone,
    onPresetSaved,
}: CustomizePresetDialogProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        best_for: '',
        principles: '',
    });
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        if (presetToClone) {
            setFormData({
                title: `${presetToClone.title} (Custom)`,
                description: presetToClone.description,
                best_for: presetToClone.best_for,
                principles: presetToClone.principles,
            });
        }
    }, [presetToClone]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        startSaving(async () => {
            try {
                await saveCustomFunnelPreset(formData);
                toast({
                    title: 'Template Saved!',
                    description: 'Your new funnel template has been created.',
                });
                onPresetSaved();
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Failed to save template',
                    description: error.message,
                });
            }
        });
    };

    if (!presetToClone) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Customize Funnel Template</DialogTitle>
                    <DialogDescription>
                        Edit the details of this template and save it as your own.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Template Title</Label>
                        <Input id="title" name="title" value={formData.title} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="best_for">Best for</Label>
                        <Input id="best_for" name="best_for" value={formData.best_for} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="principles">Core Principles (for AI)</Label>
                        <Textarea id="principles" name="principles" value={formData.principles} onChange={handleChange} rows={5} />
                         <p className="text-xs text-muted-foreground">This is the strategic context the AI will use to generate content.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save as New Template'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

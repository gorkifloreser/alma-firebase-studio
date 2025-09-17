
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
import { saveCustomFunnelPreset, updateCustomFunnelPreset } from '../actions';
import type { FunnelPreset } from '../actions';

interface CustomizePresetDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    preset: FunnelPreset | null;
    mode: 'clone' | 'edit';
    onPresetSaved: () => void;
}

export function CustomizePresetDialog({
    isOpen,
    onOpenChange,
    preset,
    mode,
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
        if (preset) {
            setFormData({
                title: mode === 'clone' ? `${preset.title} (Custom)` : preset.title,
                description: preset.description,
                best_for: preset.best_for,
                principles: preset.principles,
            });
        }
    }, [preset, mode]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!preset) return;

        startSaving(async () => {
            try {
                if (mode === 'edit') {
                    await updateCustomFunnelPreset(preset.id, formData);
                     toast({
                        title: 'Template Updated!',
                        description: 'Your custom funnel template has been saved.',
                    });
                } else {
                    await saveCustomFunnelPreset(formData);
                    toast({
                        title: 'Template Saved!',
                        description: 'Your new funnel template has been created.',
                    });
                }
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

    if (!preset) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Edit' : 'Customize'} Funnel Template</DialogTitle>
                    <DialogDescription>
                       {mode === 'edit' ? 'Update the details of your custom template.' : 'Edit the details and save it as your own new template.'}
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
                        {isSaving ? 'Saving...' : 'Save Template'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

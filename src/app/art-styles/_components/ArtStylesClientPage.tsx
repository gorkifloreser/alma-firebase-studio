

'use client';

import { useState, useTransition } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Palette, User, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

import type { ArtStyle, createArtStyle, updateArtStyle, deleteArtStyle } from '../actions';
import { Badge } from '@/components/ui/badge';


interface ArtStyleDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onStyleSaved: () => void;
    styleToEdit: ArtStyle | null;
    createAction: typeof createArtStyle;
    updateAction: typeof updateArtStyle;
}

function ArtStyleDialog({ isOpen, onOpenChange, onStyleSaved, styleToEdit, createAction, updateAction }: ArtStyleDialogProps) {
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startSaving(async () => {
            try {
                if (styleToEdit) {
                    await updateAction(styleToEdit.id, formData);
                } else {
                    await createAction(formData);
                }
                toast({ title: 'Success!', description: `Art style has been ${styleToEdit ? 'updated' : 'created'}.` });
                onStyleSaved();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{styleToEdit ? 'Edit Art Style' : 'Create New Art Style'}</DialogTitle>
                    <DialogDescription>
                        Define a reusable style that can be applied to your AI image generations.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Style Name</Label>
                        <Input id="name" name="name" defaultValue={styleToEdit?.name || ''} placeholder="e.g., Vintage Film Look" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prompt_suffix">AI Prompt Suffix</Label>
                        <Textarea
                            id="prompt_suffix"
                            name="prompt_suffix"
                            defaultValue={styleToEdit?.prompt_suffix || ''}
                            placeholder="e.g., , vintage film photography, grainy texture, muted colors"
                            className="h-32 font-mono text-sm"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            This text will be added to the end of your creative prompts.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Style'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export interface ArtStylesClientPageProps {
    initialArtStyles: ArtStyle[];
    actions: {
        createArtStyle: typeof createArtStyle;
        updateArtStyle: typeof updateArtStyle;
        deleteArtStyle: typeof deleteArtStyle;
    };
}

export function ArtStylesClientPage({ initialArtStyles, actions }: ArtStylesClientPageProps) {
    const [styles, setStyles] = useState(initialArtStyles);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [styleToEdit, setStyleToEdit] = useState<ArtStyle | null>(null);
    const [isDeleting, startDeleting] = useTransition();
    const { toast } = useToast();

    const handleDataRefresh = async () => {
        // In a real app, you might fetch data here, but for now we just close the dialog
        setIsDialogOpen(false);
        setStyleToEdit(null);
        // A full page reload will happen due to revalidatePath in the server action.
        window.location.reload();
    };

    const handleOpenDialog = (style: ArtStyle | null) => {
        setStyleToEdit(style);
        setIsDialogOpen(true);
    };

    const handleDelete = (styleId: string) => {
        startDeleting(async () => {
            try {
                await actions.deleteArtStyle(styleId);
                toast({ title: 'Success!', description: 'The art style has been deleted.' });
                handleDataRefresh();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: error.message,
                });
            }
        });
    };

    const { userStyles, globalStyles } = styles.reduce((acc, style) => {
        if (style.user_id) {
            acc.userStyles.push(style);
        } else {
            acc.globalStyles.push(style);
        }
        return acc;
    }, { userStyles: [] as ArtStyle[], globalStyles: [] as ArtStyle[] });


    const StyleCard = ({ style }: { style: ArtStyle }) => {
        const isCustom = !!style.user_id;

        return (
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle>{style.name}</CardTitle>
                        {isCustom ? (
                            <Badge variant="secondary"><User className="mr-1.5 h-3 w-3" /> Custom</Badge>
                        ) : (
                            <Badge><Palette className="mr-1.5 h-3 w-3" /> Default</Badge>
                        )}
                    </div>
                    <CardDescription>Prompt Suffix</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm font-mono text-muted-foreground bg-muted p-2 rounded-md h-full">
                        {style.prompt_suffix}
                    </p>
                </CardContent>
                {isCustom && (
                    <CardFooter className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleOpenDialog(style)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the art style '{style.name}'. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(style.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                                {isDeleting ? 'Deleting...' : 'Delete'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardFooter>
                )}
            </Card>
        )
    };

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Art Styles</h1>
                    <p className="text-muted-foreground">
                        Create and manage reusable style presets for your AI image generations.
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog(null)} className="gap-2">
                    <PlusCircle className="h-5 w-5" />
                    New Art Style
                </Button>
            </header>

            <div className="space-y-8">
                 <div>
                    <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Your Custom Styles</h2>
                    {userStyles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userStyles.map(style => <StyleCard key={style.id} style={style} />)}
                        </div>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg">
                            <Palette className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-xl font-semibold">No Custom Styles Yet</h3>
                            <p className="text-muted-foreground mt-2">
                                Click "New Art Style" to create your first one.
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Default Styles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {globalStyles.map(style => <StyleCard key={style.id} style={style} />)}
                    </div>
                </div>
            </div>

            <ArtStyleDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onStyleSaved={handleDataRefresh}
                styleToEdit={styleToEdit}
                createAction={actions.createArtStyle}
                updateAction={actions.updateArtStyle}
            />
        </div>
    );
}

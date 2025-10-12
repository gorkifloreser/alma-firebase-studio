
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

interface TextContentEditorProps {
    isLoading: boolean;
    editableContent: string;
    editableHashtags: string;
    onContentChange: (value: string) => void;
    onHashtagsChange: (value: string) => void;
}

export const TextContentEditor: React.FC<TextContentEditorProps> = ({
    isLoading,
    editableContent,
    editableHashtags,
    onContentChange,
    onHashtagsChange,
}) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Post Text & Hashtags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Post Text & Hashtags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="copy">Post Copy</Label>
                    <Textarea
                        id="copy"
                        value={editableContent}
                        onChange={(e) => onContentChange(e.target.value)}
                        placeholder="Your main post content..."
                        className="h-28"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="hashtags">Hashtags</Label>
                    <Textarea
                        id="hashtags"
                        value={editableHashtags}
                        onChange={(e) => onHashtagsChange(e.target.value)}
                        placeholder="e.g., #consciouscreator #mindfulmarketing #brandauthenticity"
                        className="h-20"
                    />
                </div>
            </CardContent>
        </Card>
    );
}


'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TextContentEditorProps {
    copy: string;
    hashtags: string;
    onCopyChange: (value: string) => void;
    onHashtagsChange: (value: string) => void;
}

export const TextContentEditor: React.FC<TextContentEditorProps> = ({
    copy,
    hashtags,
    onCopyChange,
    onHashtagsChange,
}) => {
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
                        value={copy}
                        onChange={(e) => onCopyChange(e.target.value)}
                        placeholder="Your main post content..."
                        className="h-28"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="hashtags">Hashtags</Label>
                    <Textarea
                        id="hashtags"
                        value={hashtags}
                        onChange={(e) => onHashtagsChange(e.target.value)}
                        placeholder="e.g., #consciouscreator #mindfulmarketing #brandauthenticity"
                        className="h-20"
                    />
                </div>
            </CardContent>
        </Card>
    );
}

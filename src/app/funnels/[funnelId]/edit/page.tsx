
'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function FunnelEditorPage() {
    return (
        <div className="flex h-screen items-center justify-center p-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Editor Unavailable</CardTitle>
                    <CardDescription>
                        The visual editor is temporarily unavailable due to a configuration issue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        We are working to resolve this. Please check back later.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

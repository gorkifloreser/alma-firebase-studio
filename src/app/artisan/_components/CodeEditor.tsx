// This is a new file created by refactoring src/app/artisan/page.tsx
'use client';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Copy, X } from 'lucide-react';

export const CodeEditor = ({
    code,
    setCode,
    theme,
    onClose
}: {
    code: string,
    setCode: (code: string) => void,
    theme: 'light' | 'dark',
    onClose: () => void
}) => {
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({
            title: 'Copied!',
            description: 'The code has been copied to your clipboard.',
        });
    };

    return (
        <Card className={cn(theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white')}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className={cn(theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800')}>Live Code Editor</CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleCopy} className={cn(theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black')}>
                        <Copy className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose} className={cn(theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black')}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                 <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={cn(
                        'w-full h-[400px] border rounded-md resize-y p-4 font-mono text-sm leading-relaxed',
                        theme === 'dark' 
                            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 focus-visible:ring-primary' 
                            : 'bg-gray-50 text-gray-900 border-gray-300 focus-visible:ring-primary'
                    )}
                    placeholder="HTML code..."
                />
            </CardContent>
        </Card>
    )
};

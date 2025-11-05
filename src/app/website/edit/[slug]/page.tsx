
'use client';

import { useEffect, useState, useTransition } from 'react';
import { getPageBySlug, savePage } from '@/app/website/actions';
import { useToast } from '@/hooks/use-toast';
import { config, Render, type PageData } from './components';
import { Loader2, Monitor, Tablet, Smartphone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

// Component to edit the Hero section properties
const HeroEditor = ({ data, onChange }: { data: any, onChange: (newData: any) => void }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hero-title">Title</Label>
        <Input
          id="hero-title"
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-description">Description</Label>
        <Textarea
          id="hero-description"
          value={data.description || ''}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
        />
      </div>
    </div>
  );
};

// Main Editor component
export default function WebsiteEditorPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const [pageData, setPageData] = useState<PageData | null>(null);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    const [view, setView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const data = await getPageBySlug(slug);
                // Initialize with a default Hero component if the page is new
                const initialData = data?.puck_data || {
                    content: [{ type: 'Hero', props: { title: 'Welcome', description: 'Your journey begins here.' } }],
                    root: { props: { title: slug } },
                };
                setPageData(initialData as PageData);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error loading page data',
                    description: error.message,
                });
                // Provide a default structure on error
                setPageData({
                    content: [{ type: 'Hero', props: { title: 'Welcome', description: 'Your journey begins here.' } }],
                    root: { props: { title: slug } },
                });
            }
        };
        fetchPageData();
    }, [slug, toast]);

    const handleSave = async () => {
        if (!pageData) return;
        startSaving(async () => {
             try {
                await savePage(slug, pageData);
                toast({
                    title: 'Success!',
                    description: `Page "${slug}" has been saved.`,
                });
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error saving page',
                    description: error.message,
                });
            }
        });
    };

    const handleComponentChange = (index: number, newProps: any) => {
        if (!pageData) return;
        const newContent = [...pageData.content];
        newContent[index] = { ...newContent[index], props: newProps };
        setPageData({ ...pageData, content: newContent });
    };

    if (!pageData) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    // For now, we assume we are editing the first component, which is the Hero.
    const heroComponentData = pageData.content[0];

    return (
        <>
        <Toaster />
        <div className="flex h-screen w-full bg-muted">
            {/* Properties Panel */}
            <aside className="w-80 h-screen flex-shrink-0 bg-background border-r flex flex-col">
                 <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Properties</h2>
                    <p className="text-sm text-muted-foreground">Editing: Hero Section</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {heroComponentData && (
                        <HeroEditor 
                            data={heroComponentData.props}
                            onChange={(newProps) => handleComponentChange(0, newProps)}
                        />
                    )}
                </div>
                <div className="p-4 border-t">
                    <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Page'}
                    </Button>
                </div>
            </aside>
            
            {/* Preview Panel */}
            <main className="flex-1 flex flex-col">
                <div className="flex-shrink-0 h-16 bg-background border-b flex items-center justify-center gap-2">
                    <Button variant={view === 'desktop' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('desktop')}><Monitor/></Button>
                    <Button variant={view === 'tablet' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('tablet')}><Tablet/></Button>
                    <Button variant={view === 'mobile' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('mobile')}><Smartphone/></Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                    <div 
                        className={cn("bg-background shadow-lg transition-all duration-300", {
                            "w-full": view === 'desktop',
                            "w-[768px] h-[1024px]": view === 'tablet',
                            "w-[375px] h-[667px]": view === 'mobile',
                        })}
                    >
                         <Render config={config} data={pageData} />
                    </div>
                </div>
            </main>
        </div>
        </>
    );
}

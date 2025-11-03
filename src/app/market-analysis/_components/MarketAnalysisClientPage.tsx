
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Bot, BarChart2, TrendingUp, Users, Lightbulb, PlusCircle, Trash2, Download, Eye, Search, Briefcase, ExternalLink, Globe, Instagram, Facebook, MessageSquare, Linkedin, Zap, ShieldOff, Scale, Telescope, ChevronsUp, ChevronsDown, Minus, Save, Edit } from 'lucide-react';
import { 
    summarizeMarket, 
    findCompetitors, 
    generateAutomatedMarketAnalysis,
    // Analysis Reports
    saveMarketAnalysisReport, 
    getMarketAnalysisReports, 
    deleteMarketAnalysisReport, 
    // Benchmarking Brands
    addBenchmarkingBrand,
    getBenchmarkingBrands,
    updateBenchmarkingBrand,
    deleteBenchmarkingBrand,
    type MarketAnalysisReport,
    type BenchmarkingReport,
} from '../actions';
import type { AutomatedMarketAnalysis, FindCompetitorsOutput, MarketReport, Competitor as CompetitorType } from '@/ai/flows/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ReportDownloader } from './ReportDownloader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import type { ContactPointSchema } from '@/ai/flows/types';
import { z } from 'zod';


// CARD for Saved Analysis Report
const AnalysisReportCard = ({ report, onView, onDelete }: { report: MarketAnalysisReport, onView: () => void, onDelete: () => void }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart2 className="text-primary"/>{report.title}</CardTitle>
            <CardDescription>Generated on {format(new Date(report.created_at), 'PPP')}</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onView}><Eye className="mr-2 h-4 w-4"/> View</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the report titled "{report.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
    </Card>
);

// New component for managing an individual brand
const BrandEditor = ({ brand, onSave, onDelete, onCancel }: { brand: Omit<BenchmarkingReport, 'id' | 'user_id' | 'created_at'>, onSave: (data: any) => void, onDelete?: () => void, onCancel: () => void }) => {
    const [localBrand, setLocalBrand] = useState(brand);
    const [isSaving, startSaving] = useTransition();

    const handleSave = () => {
        startSaving(async () => {
            await onSave(localBrand);
        });
    }

    const handleContactChange = (index: number, field: 'type' | 'url', value: string) => {
        const newContacts = [...localBrand.contact_points];
        (newContacts[index] as any)[field] = value;
        setLocalBrand(prev => ({...prev, contact_points: newContacts}));
    }

    const addContactPoint = () => {
        const newPoint = { type: 'Website', url: '' } as z.infer<typeof ContactPointSchema>;
        setLocalBrand(prev => ({...prev, contact_points: [...prev.contact_points, newPoint]}));
    }
    
    const removeContactPoint = (index: number) => {
         setLocalBrand(prev => ({...prev, contact_points: prev.contact_points.filter((_, i) => i !== index)}));
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Brand Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="brandName">Brand Name</Label>
                    <Input id="brandName" value={localBrand.brand_name} onChange={(e) => setLocalBrand(p => ({...p, brand_name: e.target.value}))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={localBrand.description || ''} onChange={(e) => setLocalBrand(p => ({...p, description: e.target.value}))} />
                </div>
                <div>
                    <Label>Contact Points</Label>
                    <div className="space-y-2 mt-2">
                        {localBrand.contact_points.map((point, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={point.type} onChange={(e) => handleContactChange(index, 'type', e.target.value)} placeholder="Type (e.g., Website)" />
                                <Input value={point.url} onChange={(e) => handleContactChange(index, 'url', e.target.value)} placeholder="https://..." />
                                <Button size="icon" variant="ghost" onClick={() => removeContactPoint(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                         <Button variant="outline" size="sm" onClick={addContactPoint}><PlusCircle className="mr-2 h-4 w-4"/> Add Link</Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                {onDelete && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive">Delete</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete this brand?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Brand"}</Button>
            </CardFooter>
        </Card>
    );
};


// CARD for Saved Benchmarking Brand
const BenchmarkingBrandCard = ({ brand, onEdit, onDelete }: { brand: BenchmarkingReport, onEdit: () => void, onDelete: () => void }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="text-primary"/>{brand.brand_name}</CardTitle>
            <CardDescription className="line-clamp-2">{brand.description}</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="flex flex-wrap gap-2">
                {brand.contact_points.map(point => (
                     <Button key={point.url} variant="outline" size="sm" asChild>
                        <a href={point.url} target="_blank" rel="noopener noreferrer">
                            {point.type === 'Website' && <Globe className="mr-2 h-4 w-4" />}
                            {point.type === 'Instagram' && <Instagram className="mr-2 h-4 w-4" />}
                             <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                     </Button>
                ))}
            </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}><Edit className="mr-2 h-4 w-4"/> Edit</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
                </AlertDialogTrigger>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{brand.brand_name}"?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
    </Card>
);

const SwotCard = ({ title, items, icon: Icon, colorClass }: { title: string, items: string[], icon: React.ElementType, colorClass: string }) => (
    <Card className={cn("border-2", colorClass)}>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5"/> {title}</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
                {(items || []).map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </CardContent>
    </Card>
);

const IndicatorBadge = ({ label, value }: { label: string, value?: 'Growing' | 'Slowing' | 'Stable' | 'Expansion' | 'Recession' }) => {
    if (!value) return null;
    const Icon = value === 'Growing' || value === 'Expansion' ? ChevronsUp : value === 'Slowing' || value === 'Recession' ? ChevronsDown : Minus;
    const color = value === 'Growing' || value === 'Expansion' ? 'bg-green-100 text-green-800 border-green-200' : value === 'Slowing' || value === 'Recession' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-800 border-gray-200';

    return (
        <Badge variant="outline" className={cn("text-sm py-1 px-3", color)}>
            <Icon className="mr-2 h-4 w-4" />
            <span className="font-semibold mr-1">{label}:</span> {value}
        </Badge>
    );
};

const AnalysisLevelDisplay = ({ levelData }: { levelData?: AutomatedMarketAnalysis['international'] }) => {
    if (!levelData) {
        return <Skeleton className="h-96 w-full" />;
    }
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Key Indicators</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <IndicatorBadge label="Market Growth" value={levelData.marketGrowth} />
                    <IndicatorBadge label="Economic Outlook" value={levelData.economicOutlook} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Summary</CardTitle>
                    <CardDescription>A simple overview of this market level.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{levelData.summary}</p>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SwotCard title="Strengths" items={levelData.strengths || []} icon={Zap} colorClass="border-blue-500/50" />
                <SwotCard title="Weaknesses" items={levelData.weaknesses || []} icon={ShieldOff} colorClass="border-amber-500/50" />
                <SwotCard title="Opportunities" items={levelData.opportunities || []} icon={Telescope} colorClass="border-green-500/50" />
                <SwotCard title="Threats" items={levelData.threats || []} icon={Scale} colorClass="border-red-500/50" />
            </div>
        </div>
    )
};

const AnalysisReportDisplay = ({ report, reportId }: { report: AutomatedMarketAnalysis | null, reportId?: string }) => {
    if (!report) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div id={reportId || 'report-content'} className="space-y-8 bg-background p-4 rounded-lg">
            <Tabs defaultValue="international" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="international">International</TabsTrigger>
                    <TabsTrigger value="domestic">Domestic</TabsTrigger>
                    <TabsTrigger value="local">Local</TabsTrigger>
                </TabsList>
                <TabsContent value="international" className="mt-4"><AnalysisLevelDisplay levelData={report.international} /></TabsContent>
                <TabsContent value="domestic" className="mt-4"><AnalysisLevelDisplay levelData={report.domestic} /></TabsContent>
                <TabsContent value="local" className="mt-4"><AnalysisLevelDisplay levelData={report.local} /></TabsContent>
            </Tabs>
            
            <Separator />

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> Strategic Suggestions</CardTitle>
                    <CardDescription>Actionable advice based on the combined analysis of all three market levels.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc pl-5 space-y-4 text-foreground/90 font-medium">
                        {(report.strategicSuggestions || []).map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};


const CompetitorCard = ({ competitor, onSave }: { competitor: CompetitorType, onSave: () => void }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Briefcase/> {competitor.brandName}
            </CardTitle>
            <CardDescription>{competitor.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <h4 className="font-semibold text-sm mb-2">Find them online:</h4>
            <div className="flex flex-wrap gap-2">
                {competitor.contactPoints.map(point => (
                     <Button key={point.url} variant="outline" size="sm" asChild>
                        <a href={point.url} target="_blank" rel="noopener noreferrer">
                            {point.type === 'Website' && <Globe className="mr-2 h-4 w-4" />}
                            {point.type === 'Instagram' && <Instagram className="mr-2 h-4 w-4" />}
                             <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                     </Button>
                ))}
            </div>
        </CardContent>
         <CardFooter className="justify-end">
            <Button size="sm" onClick={onSave}><Save className="mr-2 h-4 w-4" /> Save to Catalogue</Button>
        </CardFooter>
    </Card>
);

export function MarketAnalysisClientPage({ initialAnalysisReports, initialBenchmarkingBrands }: { initialAnalysisReports: MarketAnalysisReport[], initialBenchmarkingBrands: BenchmarkingReport[] }) {
    const [analysisReports, setAnalysisReports] = useState(initialAnalysisReports);
    const [benchmarkingBrands, setBenchmarkingBrands] = useState(initialBenchmarkingBrands);
    const [analysisResult, setAnalysisResult] = useState<AutomatedMarketAnalysis | null>(null);
    const [competitorsResult, setCompetitorsResult] = useState<FindCompetitorsOutput | null>(null);
    const [reportTitle, setReportTitle] = useState('');
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewingReport, setViewingReport] = useState<MarketAnalysisReport | null>(null);
    const [isBrandEditorOpen, setIsBrandEditorOpen] = useState(false);
    const [brandToEdit, setBrandToEdit] = useState<BenchmarkingReport | null>(null);
    const [marketSummary, setMarketSummary] = useState('');
    const [customQuery, setCustomQuery] = useState('');
    const [activeTab, setActiveTab] = useState('topic-report');
    const { toast } = useToast();

    useEffect(() => {
        if (activeTab === 'benchmarking' && !marketSummary && !isGenerating) {
            startGenerating(async () => {
                try {
                    const { marketSummaryPhrase } = await summarizeMarket();
                    setMarketSummary(marketSummaryPhrase);
                    setCustomQuery(marketSummaryPhrase);
                } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Could not summarize market', description: error.message });
                }
            });
        }
    }, [activeTab, marketSummary, isGenerating, toast]);

    const handleGenerateTopicReport = () => {
        setIsDialogOpen(true);
        setAnalysisResult(null);
        startGenerating(async () => {
            try {
                const result = await generateAutomatedMarketAnalysis(customQuery);
                setAnalysisResult(result);
                setReportTitle(`Automated Report: ${new Date().toLocaleDateString()}`);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error Generating Report', description: error.message });
                setIsDialogOpen(false);
            }
        });
    };
    
    const handleFindCompetitors = () => {
        setCompetitorsResult(null);
        startGenerating(async () => {
            try {
                const result = await findCompetitors(customQuery);
                setCompetitorsResult(result);
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Error Finding Competitors', description: error.message });
            }
        });
    };

    const handleSaveAnalysisReport = () => {
        if (!analysisResult || !reportTitle.trim()) return;
        startSaving(async () => {
            try {
                const newReport = await saveMarketAnalysisReport(reportTitle, analysisResult as any);
                setAnalysisReports(prev => [newReport, ...prev]);
                setIsDialogOpen(false);
                setAnalysisResult(null);
                setReportTitle('');
                toast({ title: 'Success!', description: 'Your market report has been saved.'});
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    }
    
    const handleSaveCompetitor = (competitor: CompetitorType) => {
        startSaving(async () => {
            try {
                const newBrand = await addBenchmarkingBrand({
                    brand_name: competitor.brandName,
                    description: competitor.description,
                    contact_points: competitor.contactPoints
                });
                setBenchmarkingBrands(prev => [newBrand, ...prev]);
                toast({ title: `Saved "${competitor.brandName}" to your catalogue!` });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };

    const handleDeleteReport = (reportId: string) => {
        startDeleting(async () => {
            try {
                await deleteMarketAnalysisReport(reportId);
                setAnalysisReports(prev => prev.filter(r => r.id !== reportId));
                setViewingReport(null);
                toast({ title: 'Report Deleted' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
            }
        });
    }
    
    const handleDeleteBrand = (brandId: string) => {
        startDeleting(async () => {
            try {
                await deleteBenchmarkingBrand(brandId);
                setBenchmarkingBrands(prev => prev.filter(b => b.id !== brandId));
                setIsBrandEditorOpen(false);
                toast({ title: 'Brand Deleted' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
            }
        })
    }

    const handleSaveBrand = async (brandData: Omit<BenchmarkingReport, 'id' | 'user_id' | 'created_at'>) => {
        startSaving(async () => {
             try {
                if (brandToEdit && brandToEdit.id) { // Update
                    const updatedBrand = await updateBenchmarkingBrand(brandToEdit.id, brandData);
                    setBenchmarkingBrands(prev => prev.map(b => b.id === brandToEdit.id ? updatedBrand : b));
                    toast({title: "Brand Updated!"});
                } else { // Create
                    const newBrand = await addBenchmarkingBrand(brandData);
                    setBenchmarkingBrands(prev => [newBrand, ...prev]);
                    toast({title: "Brand Added!"});
                }
                setIsBrandEditorOpen(false);
                setBrandToEdit(null);
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    }
    
    const openViewDialog = (report: MarketAnalysisReport) => {
        setViewingReport(report);
    }
    
    const openBrandEditor = (brand: BenchmarkingReport | null) => {
        if (brand) {
            setBrandToEdit(brand);
        } else {
             setBrandToEdit({
                id: '',
                user_id: '',
                created_at: '',
                brand_name: '',
                description: '',
                contact_points: []
             });
        }
        setIsBrandEditorOpen(true);
    }

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold">Market Analysis</h1>
                    <p className="text-muted-foreground">AI-powered reports and tools to understand your market and find inspiration.</p>
                </header>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList>
                        <TabsTrigger value="topic-report">Topic Report</TabsTrigger>
                        <TabsTrigger value="benchmarking">Benchmarking</TabsTrigger>
                        <TabsTrigger value="reports">Saved Reports</TabsTrigger>
                    </TabsList>
                    <TabsContent value="topic-report" className="mt-6">
                        <Card>
                            <CardHeader>
                                <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                                <CardTitle className="mt-4 text-center">Automated Market Analysis</CardTitle>
                                <CardDescription className="max-w-2xl mx-auto text-center">
                                    Generate a comprehensive market analysis report covering international, domestic, and local levels based on your brand's identity and an optional topic.
                                </CardDescription>
                            </CardHeader>
                             <CardContent>
                                <div className="max-w-lg mx-auto space-y-2">
                                    <Label htmlFor="custom-query">Your Question or Topic (Optional)</Label>
                                    <Input 
                                        id="custom-query"
                                        value={customQuery}
                                        onChange={(e) => setCustomQuery(e.target.value)}
                                        placeholder="e.g., 'market for handmade cacao products'"
                                    />
                                </div>
                            </CardContent>
                             <CardFooter className="flex justify-center">
                                <Button onClick={handleGenerateTopicReport} disabled={isGenerating}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    {isGenerating ? 'Generating...' : 'Generate Automated Report'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                    <TabsContent value="benchmarking" className="mt-6 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Find Inspirational Brands</CardTitle>
                                <CardDescription>Use your auto-generated market summary or enter a custom query to find similar brands.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(isGenerating && !competitorsResult && !marketSummary) ? (
                                    <Skeleton className="h-10 w-full" />
                                ) : (
                                    <div className="flex gap-2">
                                        <Input 
                                            value={customQuery}
                                            onChange={(e) => setCustomQuery(e.target.value)}
                                            placeholder="e.g., 'sustainable fashion for yoga practitioners'"
                                        />
                                        <Button onClick={handleFindCompetitors} disabled={isGenerating}>
                                            <Search className="mr-2 h-4 w-4" />
                                            {isGenerating ? 'Searching...' : 'Search'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {competitorsResult && (
                             <Card>
                                <CardHeader><CardTitle>AI Found These Brands</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                     {competitorsResult.competitors.map(comp => (
                                        <CompetitorCard key={comp.brandName} competitor={comp} onSave={() => handleSaveCompetitor(comp)} />
                                    ))}
                                </CardContent>
                             </Card>
                        )}
                        <Card>
                             <CardHeader className="flex flex-row justify-between items-center">
                                 <div>
                                    <CardTitle>Your Brand Catalogue</CardTitle>
                                    <CardDescription>Your personal collection of inspirational brands.</CardDescription>
                                 </div>
                                 <Button onClick={() => openBrandEditor(null)}><PlusCircle className="mr-2 h-4 w-4"/>Add Brand</Button>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                {benchmarkingBrands.length > 0 ? benchmarkingBrands.map(brand => (
                                    <BenchmarkingBrandCard key={brand.id} brand={brand} onEdit={() => openBrandEditor(brand)} onDelete={() => handleDeleteBrand(brand.id)} />
                                )) : <p className="text-sm text-center text-muted-foreground py-8">Your catalogue is empty.</p>}
                             </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="reports" className="mt-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Saved Reports</CardTitle>
                                <CardDescription>Review your previously generated market analysis reports.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analysisReports.length === 0 ? (
                                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                        <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="text-xl font-semibold mt-4">No Reports Saved Yet</h3>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {analysisReports.map(report => (
                                            <AnalysisReportCard key={report.id} report={report} onView={() => openViewDialog(report)} onDelete={() => handleDeleteReport(report.id)} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialog for Generating/Saving Topic Report */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>New Automated Market Report</DialogTitle>
                        <DialogDescription>Review the AI-generated report below and save it for future reference.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                        {(isGenerating && !analysisResult) ? (
                            <div className="space-y-6">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-10 w-full" />
                                 <Skeleton className="h-40 w-full" />
                            </div>
                        ) : analysisResult ? (
                            <div className="space-y-4">
                               <div className="space-y-2">
                                    <Label htmlFor="report-title">Report Title</Label>
                                    <Input id="report-title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
                                </div>
                               <AnalysisReportDisplay report={analysisResult} />
                            </div>
                        ) : (
                             <div className="text-center py-20">
                                <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">The AI is researching your topic...</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAnalysisReport} disabled={isGenerating || isSaving || !analysisResult}>
                            {isSaving ? 'Saving...' : 'Save Report'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog for Viewing Saved Analysis Report */}
            <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{viewingReport?.title}</DialogTitle>
                        <DialogDescription>Generated on {viewingReport ? format(new Date(viewingReport.created_at), 'PPP') : ''}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                        {viewingReport && <AnalysisReportDisplay report={(viewingReport as MarketAnalysisReport).report_data} reportId={`report-${viewingReport.id}`} />}
                    </div>
                    <DialogFooter className="justify-between">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="destructive" disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : <><Trash2 className="mr-2 h-4 w-4"/> Delete</>}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this report.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteReport(viewingReport!.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div>
                            <Button variant="outline" onClick={() => setViewingReport(null)}>Close</Button>
                            <ReportDownloader reportId={`report-${viewingReport?.id}`} fileName={viewingReport?.title || 'market-analysis'} />
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog for Editing/Adding a Brand */}
             <Dialog open={isBrandEditorOpen} onOpenChange={setIsBrandEditorOpen}>
                <DialogContent>
                    <BrandEditor
                        brand={brandToEdit || { brand_name: '', description: '', contact_points: [] }}
                        onSave={handleSaveBrand}
                        onDelete={brandToEdit?.id ? () => handleDeleteBrand(brandToEdit.id) : undefined}
                        onCancel={() => setIsBrandEditorOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}


'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Bot, BarChart2, TrendingUp, Users, Lightbulb, PlusCircle, Trash2, Download, Eye, Search, Briefcase, ExternalLink, Globe, Instagram, Facebook, MessageSquare, Linkedin, Zap, ShieldOff, Scale, Telescope, ChevronsUp, ChevronsDown, Minus, Save } from 'lucide-react';
import { 
    generateAutomatedMarketAnalysis, 
    saveMarketAnalysisReport, 
    getMarketAnalysisReports, 
    deleteMarketAnalysisReport, 
    summarizeMarket, 
    findCompetitors, 
    generateMarketReport,
    saveBenchmarkingReport,
    deleteBenchmarkingReport,
    type MarketAnalysisReport,
    type BenchmarkingReport,
} from '../actions';
import type { AutomatedMarketAnalysis, FindCompetitorsOutput, MarketReport } from '@/ai/flows/types';
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

const BenchmarkingReportCard = ({ report, onView, onDelete }: { report: BenchmarkingReport, onView: () => void, onDelete: () => void }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="text-primary"/>{report.title}</CardTitle>
            <CardDescription>Generated on {format(new Date(report.created_at), 'PPP')}</CardDescription>
        </CardHeader>
         <CardContent>
            <p className="text-sm text-muted-foreground italic">Based on summary: "{report.market_summary}"</p>
        </CardContent>
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


const SwotCard = ({ title, items, icon: Icon, colorClass }: { title: string, items: string[], icon: React.ElementType, colorClass: string }) => (
    <Card className={cn("border-2", colorClass)}>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5"/> {title}</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
                {items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </CardContent>
    </Card>
);

const IndicatorBadge = ({ label, value }: { label: string, value: 'Growing' | 'Slowing' | 'Stable' | 'Expansion' | 'Recession' }) => {
    const Icon = value === 'Growing' || value === 'Expansion' ? ChevronsUp : value === 'Slowing' || value === 'Recession' ? ChevronsDown : Minus;
    const color = value === 'Growing' || value === 'Expansion' ? 'bg-green-100 text-green-800 border-green-200' : value === 'Slowing' || value === 'Recession' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-800 border-gray-200';

    return (
        <Badge variant="outline" className={cn("text-sm py-1 px-3", color)}>
            <Icon className="mr-2 h-4 w-4" />
            <span className="font-semibold mr-1">{label}:</span> {value}
        </Badge>
    );
};

const AnalysisLevelDisplay = ({ levelData }: { levelData: AutomatedMarketAnalysis['international'] | null }) => {
    if (!levelData) {
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
            <p className="text-muted-foreground text-center italic px-4">{levelData.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SwotCard title="Strengths" items={levelData.strengths} icon={Zap} colorClass="border-blue-200 dark:border-blue-800" />
                <SwotCard title="Weaknesses" items={levelData.weaknesses} icon={ShieldOff} colorClass="border-amber-200 dark:border-amber-800" />
                <SwotCard title="Opportunities" items={levelData.opportunities} icon={Telescope} colorClass="border-green-200 dark:border-green-800" />
                <SwotCard title="Threats" items={levelData.threats} icon={Scale} colorClass="border-red-200 dark:border-red-800" />
            </div>
        </div>
    );
};


const AnalysisReportDisplay = ({ report, reportId }: { report: AutomatedMarketAnalysis | null, reportId?: string }) => {
    if (!report) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                 <Skeleton className="h-40 w-full" />
            </div>
        );
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


const CompetitorCard = ({ competitor }: { competitor: FindCompetitorsOutput['competitors'][0] }) => (
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
                            {point.type === 'Facebook' && <Facebook className="mr-2 h-4 w-4" />}
                            {point.type === 'TikTok' && <MessageSquare className="mr-2 h-4 w-4" />}
                            {point.type === 'LinkedIn' && <Linkedin className="mr-2 h-4 w-4" />}
                            {point.type} <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                     </Button>
                ))}
            </div>
        </CardContent>
    </Card>
);

export function MarketAnalysisClientPage({ initialAnalysisReports, initialBenchmarkingReports }: { initialAnalysisReports: MarketAnalysisReport[], initialBenchmarkingReports: BenchmarkingReport[] }) {
    const [analysisReports, setAnalysisReports] = useState(initialAnalysisReports);
    const [benchmarkingReports, setBenchmarkingReports] = useState(initialBenchmarkingReports);
    const [analysisResult, setAnalysisResult] = useState<MarketReport | null>(null);
    const [competitorsResult, setCompetitorsResult] = useState<FindCompetitorsOutput | null>(null);
    const [topicReportResult, setTopicReportResult] = useState<MarketReport | null>(null);
    const [reportTitle, setReportTitle] = useState('');
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewingReport, setViewingReport] = useState<MarketAnalysisReport | BenchmarkingReport | null>(null);
    const [viewingReportType, setViewingReportType] = useState<'analysis' | 'benchmarking' | null>(null);
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
                    setCustomQuery(marketSummaryPhrase); // Pre-fill the custom query
                } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Could not summarize market', description: error.message });
                }
            });
        }
    }, [activeTab, marketSummary, isGenerating, toast]);

    const handleGenerateTopicReport = () => {
        if (!customQuery.trim()) {
            toast({ variant: 'destructive', title: 'Please enter a topic' });
            return;
        }
        setIsDialogOpen(true);
        setAnalysisResult(null);
        startGenerating(async () => {
            try {
                const result = await generateMarketReport({ topic: customQuery });
                setAnalysisResult(result);
                setReportTitle(`Report on: ${customQuery}`);
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
                // The automated analysis is now a full report, so we save it as such.
                // We're re-using the MarketAnalysisReport table.
                // Note: The schema for AutomatedMarketAnalysis is different, so this needs adjustment.
                // For now, let's just save the summary as a placeholder. This needs a backend change.
                // const newReport = await saveMarketAnalysisReport(reportTitle, analysisResult);
                // setAnalysisReports(prev => [newReport, ...prev]);
                setIsDialogOpen(false);
                setAnalysisResult(null);
                setReportTitle('');
                toast({ title: 'Note: Save functionality for this report type is in development.' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    }
    
    const handleSaveBenchmarkingReport = () => {
        if (!competitorsResult || !reportTitle.trim()) return;
        startSaving(async () => {
            try {
                const newReport = await saveBenchmarkingReport(reportTitle, customQuery, competitorsResult.competitors);
                setBenchmarkingReports(prev => [newReport, ...prev]);
                setCompetitorsResult(null); // Clear after saving
                setReportTitle('');
                toast({ title: 'Benchmarking Report Saved!' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    }

    const handleDeleteReport = (reportId: string, type: 'analysis' | 'benchmarking') => {
        startDeleting(async () => {
            try {
                if (type === 'analysis') {
                    await deleteMarketAnalysisReport(reportId);
                    setAnalysisReports(prev => prev.filter(r => r.id !== reportId));
                } else {
                    await deleteBenchmarkingReport(reportId);
                    setBenchmarkingReports(prev => prev.filter(r => r.id !== reportId));
                }
                setViewingReport(null);
                toast({ title: 'Report Deleted' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
            }
        });
    }
    
    const openViewDialog = (report: MarketAnalysisReport | BenchmarkingReport, type: 'analysis' | 'benchmarking') => {
        setViewingReport(report);
        setViewingReportType(type);
    }

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Market Analysis</h1>
                        <p className="text-muted-foreground">AI-powered reports and tools to understand your market and find inspiration.</p>
                    </div>
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
                                <CardTitle className="mt-4 text-center">Topic-Specific Market Report</CardTitle>
                                <CardDescription className="max-w-2xl mx-auto text-center">
                                    Ask the AI a specific question or provide a topic to get a detailed market report including trends, opportunities, and threats.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="max-w-xl mx-auto">
                                <div className="space-y-2">
                                    <Label htmlFor="topic-input">Your Topic or Question</Label>
                                    <Input 
                                        id="topic-input"
                                        value={customQuery}
                                        onChange={(e) => setCustomQuery(e.target.value)}
                                        placeholder="e.g., 'The future of ceremonial cacao in Europe' or 'marketing to millennials interested in astrology'"
                                    />
                                </div>
                            </CardContent>
                             <CardFooter className="flex justify-center">
                                <Button onClick={handleGenerateTopicReport} disabled={isGenerating || !customQuery.trim()}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Topic Report
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                    <TabsContent value="benchmarking" className="mt-6 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Find Competitors & Inspiration</CardTitle>
                                <CardDescription>Use your auto-generated market summary or enter a custom query to find similar brands.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isGenerating && !competitorsResult && !marketSummary ? (
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
                                            Search
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                            {competitorsResult && (
                                <CardFooter className="flex flex-col items-start gap-4">
                                    <Separator />
                                    <div className="flex justify-between items-center w-full pt-4">
                                        <h3 className="font-semibold">Research Results:</h3>
                                        <div className="flex gap-2 items-center">
                                            <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="Enter report title to save..." />
                                            <Button onClick={handleSaveBenchmarkingReport} disabled={isSaving || !reportTitle.trim()}>
                                                <Save className="mr-2 h-4 w-4"/>
                                                {isSaving ? 'Saving...' : 'Save Results'}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                                        {competitorsResult.competitors.map(comp => (
                                            <CompetitorCard key={comp.brandName} competitor={comp} />
                                        ))}
                                    </div>
                                </CardFooter>
                            )}
                        </Card>
                    </TabsContent>
                    <TabsContent value="reports" className="mt-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Saved Reports</CardTitle>
                                <CardDescription>Review your previously generated market analysis and benchmarking reports.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {(analysisReports.length === 0 && benchmarkingReports.length === 0) ? (
                                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                        <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="text-xl font-semibold mt-4">No Reports Saved Yet</h3>
                                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                            Go to the "Topic Report" or "Benchmarking" tab to generate and save your first report.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {analysisReports.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4">Market Analysis Reports</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {analysisReports.map(report => (
                                                        <AnalysisReportCard key={report.id} report={report} onView={() => openViewDialog(report, 'analysis')} onDelete={() => handleDeleteReport(report.id, 'analysis')} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {benchmarkingReports.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4">Benchmarking Reports</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {benchmarkingReports.map(report => (
                                                        <BenchmarkingReportCard key={report.id} report={report} onView={() => openViewDialog(report, 'benchmarking')} onDelete={() => handleDeleteReport(report.id, 'benchmarking')} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialog for Generating and Saving */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>New Market Report</DialogTitle>
                        <DialogDescription>Review the AI-generated report below and save it for future reference.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                        {isGenerating && !analysisResult ? (
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
                                <Card>
                                    <CardHeader><CardTitle>Market Summary</CardTitle></CardHeader>
                                    <CardContent><p className="text-muted-foreground">{analysisResult.marketSummary}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>Key Trends</CardTitle></CardHeader>
                                    <CardContent><ul className="list-disc pl-5 space-y-2">{analysisResult.keyTrends.map((t,i) => <li key={i}>{t}</li>)}</ul></CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader><CardTitle>Opportunities</CardTitle></CardHeader>
                                    <CardContent><ul className="list-disc pl-5 space-y-2">{analysisResult.opportunities.map((o,i) => <li key={i}>{o}</li>)}</ul></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>Threats</CardTitle></CardHeader>
                                    <CardContent><ul className="list-disc pl-5 space-y-2">{analysisResult.threats.map((t,i) => <li key={i}>{t}</li>)}</ul></CardContent>
                                </Card>
                                <Card className="bg-primary/5">
                                    <CardHeader><CardTitle>Strategic Recommendations</CardTitle></CardHeader>
                                    <CardContent><p className="font-medium">{analysisResult.strategicRecommendations}</p></CardContent>
                                </Card>
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

            {/* Dialog for Viewing and Downloading */}
            <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{viewingReport?.title}</DialogTitle>
                        <DialogDescription>Generated on {viewingReport ? format(new Date(viewingReport.created_at), 'PPP') : ''}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                        {viewingReport && viewingReportType === 'analysis' && <AnalysisReportDisplay report={(viewingReport as MarketAnalysisReport).report_data} reportId={`report-${viewingReport.id}`} />}
                        {viewingReport && viewingReportType === 'benchmarking' && (
                            <div className="space-y-4">
                                <h4 className="font-semibold">Market Summary Searched:</h4>
                                <p className="text-muted-foreground italic">"{(viewingReport as BenchmarkingReport).market_summary}"</p>
                                <Separator />
                                <h4 className="font-semibold">Competitors Found:</h4>
                                 <div className="grid grid-cols-1 gap-4 w-full">
                                    {(viewingReport as BenchmarkingReport).competitors.map(comp => (
                                        <CompetitorCard key={comp.brandName} competitor={comp} />
                                    ))}
                                </div>
                            </div>
                        )}
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
                                    <AlertDialogAction onClick={() => handleDeleteReport(viewingReport!.id, viewingReportType!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div>
                            <Button variant="outline" onClick={() => setViewingReport(null)}>Close</Button>
                            {viewingReportType === 'analysis' && (
                                <ReportDownloader reportId={`report-${viewingReport?.id}`} fileName={viewingReport?.title || 'market-analysis'} />
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

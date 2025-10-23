
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Bot, BarChart2, TrendingUp, Users, Lightbulb, PlusCircle, Trash2, Download, Eye, Search, Briefcase, ExternalLink, Globe, Instagram, Facebook, MessageSquare, Linkedin, Zap, ShieldOff, Scale, Telescope } from 'lucide-react';
import { 
    generateAutomatedMarketAnalysis, 
    saveMarketAnalysisReport, 
    getMarketAnalysisReports, 
    deleteMarketAnalysisReport, 
    summarizeMarket, 
    findCompetitors, 
    generateMarketReport,
    type MarketAnalysisReport 
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

const ReportCard = ({ report, onView, onDelete }: { report: MarketAnalysisReport, onView: () => void, onDelete: () => void }) => (
    <Card>
        <CardHeader>
            <CardTitle>{report.title}</CardTitle>
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

const SwotCard = ({ title, items, icon: Icon, colorClass }: { title: string, items: string[], icon: React.ElementType, colorClass: string }) => (
    <Card className={colorClass}>
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

const AnalysisReportDisplay = ({ report, reportId }: { report: AutomatedMarketAnalysis, reportId?: string }) => (
    <div id={reportId || 'report-content'} className="space-y-8 bg-background p-4 rounded-lg">
        
        {/* SWOT Analysis Section */}
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center">SWOT Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SwotCard title="Strengths" items={report.strengths} icon={Zap} colorClass="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" />
                <SwotCard title="Weaknesses" items={report.weaknesses} icon={ShieldOff} colorClass="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" />
                <SwotCard title="Opportunities" items={report.opportunities} icon={Telescope} colorClass="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" />
                <SwotCard title="Threats" items={report.threats} icon={Scale} colorClass="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" />
            </div>
        </div>

        <Separator />

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart2 className="text-primary"/> Market Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{report.marketSummary}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="text-primary"/> Key Trends</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    {report.keyTrends.map((trend, index) => (
                        <li key={index}>{trend}</li>
                    ))}
                </ul>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> Customer Profile</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{report.customerProfile}</p>
            </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> Strategic Suggestions</CardTitle>
                 <CardDescription>Actionable advice based on the SWOT analysis above.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-5 space-y-4 text-foreground/90 font-medium">
                    {report.strategicSuggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    </div>
);


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

export function MarketAnalysisClientPage({ initialReports }: { initialReports: MarketAnalysisReport[] }) {
    const [reports, setReports] = useState(initialReports);
    const [analysisResult, setAnalysisResult] = useState<AutomatedMarketAnalysis | null>(null);
    const [competitorsResult, setCompetitorsResult] = useState<FindCompetitorsOutput | null>(null);
    const [topicReportResult, setTopicReportResult] = useState<MarketReport | null>(null);
    const [reportTitle, setReportTitle] = useState('');
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewingReport, setViewingReport] = useState<MarketAnalysisReport | null>(null);
    const [marketSummary, setMarketSummary] = useState('');
    const [customQuery, setCustomQuery] = useState('');
    const [activeTab, setActiveTab] = useState('auto-analysis');
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

    const handleAutoGenerate = () => {
        setIsDialogOpen(true);
        setAnalysisResult(null);
        startGenerating(async () => {
            try {
                const result = await generateAutomatedMarketAnalysis();
                setAnalysisResult(result);
                setReportTitle(`Automated Market Analysis - ${format(new Date(), 'PPP')}`);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error Generating Analysis', description: error.message });
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

    const handleSaveReport = () => {
        if (!analysisResult || !reportTitle.trim()) return;
        startSaving(async () => {
            try {
                const newReport = await saveMarketAnalysisReport(reportTitle, analysisResult);
                setReports(prev => [newReport, ...prev]);
                setIsDialogOpen(false);
                setAnalysisResult(null);
                setReportTitle('');
                toast({ title: 'Report Saved!' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    }

    const handleDeleteReport = (reportId: string) => {
        startDeleting(async () => {
            try {
                await deleteMarketAnalysisReport(reportId);
                setReports(prev => prev.filter(r => r.id !== reportId));
                setViewingReport(null);
                toast({ title: 'Report Deleted' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
            }
        });
    }
    
    const openViewDialog = (report: MarketAnalysisReport) => {
        setViewingReport(report);
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
                        <TabsTrigger value="auto-analysis">Automated Analysis</TabsTrigger>
                        <TabsTrigger value="benchmarking">Benchmarking</TabsTrigger>
                        <TabsTrigger value="reports">Saved Reports</TabsTrigger>
                    </TabsList>
                    <TabsContent value="auto-analysis" className="mt-6">
                        <Card className="text-center">
                            <CardHeader>
                                <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                                <CardTitle className="mt-4">Automated Market Report</CardTitle>
                                <CardDescription className="max-w-2xl mx-auto">
                                    Click the button to get an instant, AI-powered market analysis based on your Brand Heart and Offerings. The AI will research your niche and provide a summary, key trends, and strategic suggestions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={handleAutoGenerate}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Automated Report
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="benchmarking" className="mt-6 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Find Competitors & Inspiration</CardTitle>
                                <CardDescription>Use your auto-generated market summary or enter a custom query to find similar brands.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isGenerating && !competitorsResult ? (
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
                                    <h3 className="font-semibold mt-4">Research Results:</h3>
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
                                <CardDescription>Review your previously generated market analysis reports.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {reports.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {reports.map(report => (
                                            <ReportCard 
                                                key={report.id} 
                                                report={report}
                                                onView={() => openViewDialog(report)}
                                                onDelete={() => handleDeleteReport(report.id)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                        <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="text-xl font-semibold mt-4">No Reports Saved Yet</h3>
                                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                            Go to the "Automated Analysis" tab to generate and save your first report.
                                        </p>
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
                        <DialogTitle>New Market Analysis</DialogTitle>
                        <DialogDescription>Review the AI-generated report below and save it for future reference.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                        {isGenerating && !analysisResult ? (
                            <div className="space-y-6">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-32 w-full" />
                                <Skeleton className="h-24 w-full" />
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
                                <p className="mt-4 text-muted-foreground">The AI is analyzing your brand and market...</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveReport} disabled={isGenerating || isSaving || !analysisResult}>
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
                        {viewingReport && <AnalysisReportDisplay report={viewingReport.report_data} reportId={`report-${viewingReport.id}`} />}
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
        </>
    );
}

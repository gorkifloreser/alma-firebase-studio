
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Bot, BarChart2, TrendingUp, Users, Lightbulb, PlusCircle, Trash2, Download, Eye } from 'lucide-react';
import { generateAutomatedMarketAnalysis, saveMarketAnalysisReport, getMarketAnalysisReports, deleteMarketAnalysisReport, type MarketAnalysisReport } from '../actions';
import type { AutomatedMarketAnalysis } from '@/ai/flows/types';
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

const AnalysisReportDisplay = ({ report, reportId }: { report: AutomatedMarketAnalysis, reportId?: string }) => (
    <div id={reportId || 'report-content'} className="space-y-6 bg-background p-4 rounded-lg">
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
            <Card className="bg-primary/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> Strategic Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
                    <ul className="list-disc pl-5 space-y-2 text-foreground/90 font-medium">
                    {report.strategicSuggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    </div>
);

export function MarketAnalysisClientPage({ initialReports }: { initialReports: MarketAnalysisReport[] }) {
    const [reports, setReports] = useState(initialReports);
    const [analysisResult, setAnalysisResult] = useState<AutomatedMarketAnalysis | null>(null);
    const [reportTitle, setReportTitle] = useState('');
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewingReport, setViewingReport] = useState<MarketAnalysisReport | null>(null);
    const { toast } = useToast();

    const handleGenerate = () => {
        console.log('[CLIENT] handleGenerate initiated.');
        setAnalysisResult(null);
        setReportTitle('');
        startGenerating(async () => {
            try {
                const result = await generateAutomatedMarketAnalysis();
                console.log('[CLIENT] Analysis successful, received data:', result);
                setAnalysisResult(result);
                setReportTitle(`Market Analysis - ${format(new Date(), 'PPP')}`);
            } catch (error: any) {
                console.error('[CLIENT] --- FATAL ANALYSIS ERROR ---', error);
                toast({
                    variant: 'destructive',
                    title: 'Error Generating Analysis',
                    description: `Could not complete the analysis: ${error.message}`,
                });
                setIsDialogOpen(false);
            }
        });
    };

    const handleSaveReport = () => {
        if (!analysisResult || !reportTitle.trim()) {
            toast({ variant: 'destructive', title: 'Missing Data', description: 'Cannot save an empty report or a report without a title.' });
            return;
        }
        startSaving(async () => {
            try {
                const newReport = await saveMarketAnalysisReport(reportTitle, analysisResult);
                setReports(prev => [newReport, ...prev]);
                setIsDialogOpen(false);
                setAnalysisResult(null);
                setReportTitle('');
                toast({ title: 'Report Saved!', description: 'Your market analysis has been saved.' });
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
                setViewingReport(null); // Close the view dialog if it's the one being deleted
                toast({ title: 'Report Deleted', description: 'The report has been permanently removed.' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
            }
        });
    }

    const openGenerateDialog = () => {
        setIsDialogOpen(true);
        handleGenerate();
    }
    
    const openViewDialog = (report: MarketAnalysisReport) => {
        setViewingReport(report);
    }

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Automated Market Analysis</h1>
                        <p className="text-muted-foreground">Get an AI-powered market report and strategic suggestions based on your Brand DNA.</p>
                    </div>
                    <Button onClick={openGenerateDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Generate New Report
                    </Button>
                </header>

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
                                <h3 className="text-xl font-semibold mt-4">No Reports Generated Yet</h3>
                                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                    Click "Generate New Report" to get your first AI-powered market analysis.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Dialog for Generating and Saving */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>New Market Analysis</DialogTitle>
                        <DialogDescription>Review the AI-generated report below and save it for future reference.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                        {isGenerating ? (
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
                                <p className="mt-4 text-muted-foreground">Click "Generate New Report" to start.</p>
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
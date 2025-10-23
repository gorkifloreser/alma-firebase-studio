
'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Bot, BarChart2, TrendingUp, Users, Lightbulb } from 'lucide-react';
import { generateAutomatedMarketAnalysis } from '../actions';
import type { AutomatedMarketAnalysis } from '@/ai/flows/types';
import { Skeleton } from '@/components/ui/skeleton';

export function MarketAnalysisClientPage() {
    const [analysisResult, setAnalysisResult] = useState<AutomatedMarketAnalysis | null>(null);
    const [isGenerating, startGenerating] = useTransition();
    const { toast } = useToast();

    const handleGenerate = () => {
        console.log('[CLIENT] handleGenerate initiated.');
        setAnalysisResult(null); // Clear previous results
        startGenerating(async () => {
            try {
                const result = await generateAutomatedMarketAnalysis();
                console.log('[CLIENT] Analysis successful, received data:', result);
                setAnalysisResult(result);
                toast({
                    title: '¡Análisis Completo!',
                    description: 'Tu reporte de mercado personalizado está listo.',
                });
            } catch (error: any) {
                console.error('[CLIENT] --- FATAL ANALYSIS ERROR ---', error);
                toast({
                    variant: 'destructive',
                    title: 'Error al Generar Análisis',
                    description: `No se pudo completar el análisis: ${error.message}`,
                });
            }
        });
    };

    const renderReport = () => {
        if (!analysisResult) return null;

        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart2 className="text-primary"/> Resumen del Mercado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{analysisResult.marketSummary}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="text-primary"/> Tendencias Clave</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            {analysisResult.keyTrends.map((trend, index) => (
                                <li key={index}>{trend}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> Perfil del Consumidor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{analysisResult.customerProfile}</p>
                    </CardContent>
                </Card>
                 <Card className="bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> Sugerencias Estratégicas</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ul className="list-disc pl-5 space-y-2 text-foreground/90 font-medium">
                            {analysisResult.strategicSuggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    const renderContent = () => {
        if (isGenerating) {
            return (
                <div className="space-y-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            );
        }
        if (analysisResult) {
            return renderReport();
        }
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold mt-4">Listo para analizar tu mercado</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    La IA utilizará tu Brand Heart y Offerings para investigar las tendencias actuales y darte sugerencias estratégicas.
                </p>
                <Button onClick={handleGenerate} disabled={isGenerating} className="mt-6">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Analizando...' : 'Generar Análisis de Mercado'}
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Análisis de Mercado Automatizado</h1>
                <p className="text-muted-foreground">Obtén un reporte de mercado y sugerencias estratégicas generadas por IA.</p>
            </header>
            
            {renderContent()}
        </div>
    );
}

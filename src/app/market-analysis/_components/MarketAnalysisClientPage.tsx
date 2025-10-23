'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { Lightbulb } from 'lucide-react';
import type { MarketAnalysisData, updateMarketAnalysisData } from '../actions';

interface MarketAnalysisClientPageProps {
    initialData: MarketAnalysisData | null;
    updateAction: typeof updateMarketAnalysisData;
}

/**
 * Generates a business suggestion based on market data.
 * @param data The market analysis data.
 * @returns A string containing the business suggestion.
 */
function getBusinessSuggestion(data: MarketAnalysisData | null): string {
    console.log('[CLIENT] getBusinessSuggestion called with data:', data);
    if (!data) {
        return "Enter your market data to receive a strategic suggestion.";
    }

    const { indice_demanda_mensual, indice_oferta_competencia } = data;

    // RULE 1: Low demand, high competition
    if (indice_demanda_mensual <= 40 && indice_oferta_competencia >= 60) {
        console.log('[CLIENT] Suggestion Rule 1 Triggered: Low demand, high competition.');
        return "La demanda es baja y la competencia es alta. Es hora de ofertas o promociones agresivas para mover inventario.";
    }

    // RULE 2: High demand, low competition
    if (indice_demanda_mensual >= 70 && indice_oferta_competencia <= 30) {
        console.log('[CLIENT] Suggestion Rule 2 Triggered: High demand, low competition.');
        return "Excelente oportunidad. La demanda es alta y la competencia es baja. Aumenta ligeramente los precios y prioriza la inversión en capacidad.";
    }

    // RULE 3: Stable market
    if (
        (indice_demanda_mensual > 40 && indice_demanda_mensual < 70) &&
        (indice_oferta_competencia > 30 && indice_oferta_competencia < 60)
    ) {
        console.log('[CLIENT] Suggestion Rule 3 Triggered: Stable market.');
        return "Mercado estable. Conserva tus precios, pero enfócate en aumentar la percepción de valor (ej. mejor servicio o empaque premium).";
    }

    // Default suggestion if no specific rule is met
    console.log('[CLIENT] No specific rule triggered, returning default suggestion.');
    return "El mercado presenta una dinámica mixta. Analiza en detalle cada variable antes de tomar decisiones estratégicas.";
}

export function MarketAnalysisClientPage({ initialData, updateAction }: MarketAnalysisClientPageProps) {
    const [data, setData] = useState<MarketAnalysisData>(initialData || {
        indice_demanda_mensual: 50,
        indice_oferta_competencia: 50,
        tendencia_precios_promedio: 0,
        margen_ganancia_actual: 25,
    });
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        console.log('[CLIENT] Initial data received:', initialData);
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    const handleSliderChange = (field: keyof MarketAnalysisData, value: number[]) => {
        console.log(`[CLIENT] Slider change: ${field} = ${value[0]}`);
        setData(prev => ({ ...prev, [field]: value[0] }));
    };

    const handleInputChange = (field: keyof MarketAnalysisData, event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value);
        console.log(`[CLIENT] Input change: ${field} = ${value}`);
        if (!isNaN(value)) {
            setData(prev => ({ ...prev, [field]: value }));
        }
    };
    
    const businessSuggestion = useMemo(() => getBusinessSuggestion(data), [data]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        console.log('[CLIENT] handleSubmit initiated. Saving data:', data);
        startSaving(async () => {
            try {
                const result = await updateAction(data);
                console.log('[CLIENT] Save successful, server responded:', result);
                toast({
                    title: '¡Guardado!',
                    description: 'Tus datos de análisis de mercado han sido actualizados.',
                });
            } catch (error: any) {
                console.error('[CLIENT] --- FATAL SAVE ERROR ---', error);
                toast({
                    variant: 'destructive',
                    title: 'Error al Guardar',
                    description: `No se pudieron guardar los datos: ${error.message}`,
                });
            }
        });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Análisis de Tendencias de Mercado</h1>
                <p className="text-muted-foreground">Ingresa los datos de tu mercado para recibir sugerencias estratégicas.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Card>
                    <form onSubmit={handleSubmit}>
                        <CardHeader>
                            <CardTitle>Entrada de Datos</CardTitle>
                            <CardDescription>Ajusta los sliders para reflejar las condiciones actuales del mercado.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label htmlFor="demanda">Índice de Demanda Mensual</Label>
                                    <Input type="number" className="w-24 h-8" value={data.indice_demanda_mensual} onChange={(e) => handleInputChange('indice_demanda_mensual', e)} />
                                </div>
                                <Slider id="demanda" value={[data.indice_demanda_mensual]} onValueChange={(v) => handleSliderChange('indice_demanda_mensual', v)} max={100} step={1} />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label htmlFor="oferta">Índice de Oferta de la Competencia</Label>
                                     <Input type="number" className="w-24 h-8" value={data.indice_oferta_competencia} onChange={(e) => handleInputChange('indice_oferta_competencia', e)} />
                                </div>
                                <Slider id="oferta" value={[data.indice_oferta_competencia]} onValueChange={(v) => handleSliderChange('indice_oferta_competencia', v)} max={100} step={1} />
                            </div>
                             <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label htmlFor="tendencia">Tendencia de Precios (%)</Label>
                                     <Input type="number" className="w-24 h-8" value={data.tendencia_precios_promedio} onChange={(e) => handleInputChange('tendencia_precios_promedio', e)} />
                                </div>
                                <Slider id="tendencia" value={[data.tendencia_precios_promedio]} onValueChange={(v) => handleSliderChange('tendencia_precios_promedio', v)} min={-50} max={50} step={1} />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label htmlFor="margen">Margen de Ganancia Actual (%)</Label>
                                    <Input type="number" className="w-24 h-8" value={data.margen_ganancia_actual} onChange={(e) => handleInputChange('margen_ganancia_actual', e)} />
                                </div>
                                <Slider id="margen" value={[data.margen_ganancia_actual]} onValueChange={(v) => handleSliderChange('margen_ganancia_actual', v)} max={100} step={1} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Guardando...' : 'Guardar Análisis'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                 <Card className="bg-primary/5 sticky top-24">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> Sugerencia de Negocio Clave</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-medium text-foreground/90">
                            {businessSuggestion}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


'use client';

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

// Dynamically import jspdf and html2canvas only when needed on the client-side
const downloadPdf = async (elementId: string, fileName: string) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    
    const input = document.getElementById(elementId);
    if (!input) {
        throw new Error(`Element with id "${elementId}" not found.`);
    }

    // Use html2canvas to render the element to a canvas
    const canvas = await html2canvas(input, {
        scale: 2, // Increase scale for better resolution
        useCORS: true,
        backgroundColor: null, // Use transparent background, pdf will handle it
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
        hotfixes: ['px_scaling'], // Important for consistent scaling
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    const imgWidth = pdfWidth;
    const imgHeight = imgWidth / ratio;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Add content to the PDF
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Handle multi-page content
    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
    }
    
    pdf.save(`${fileName.replace(/ /g, '_')}.pdf`);
};


interface ReportDownloaderProps {
    reportId: string;
    fileName: string;
}

export function ReportDownloader({ reportId, fileName }: ReportDownloaderProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();

    const handleDownload = async () => {
        setIsDownloading(true);
        toast({ title: 'Preparing Download', description: 'Your PDF is being generated...' });

        try {
            await downloadPdf(reportId, fileName);
        } catch (error: any) {
            console.error('[PDF Download Error]', error);
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: `Could not generate PDF: ${error.message}`,
            });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? 'Generating...' : 'Download PDF'}
        </Button>
    );
}
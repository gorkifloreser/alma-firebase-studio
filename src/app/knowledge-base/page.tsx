
'use client';

import React, { useEffect, useState, useTransition, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadBrandDocument, getBrandDocuments, deleteBrandDocument, BrandDocument } from './actions';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function KnowledgeBasePage() {
    const [documents, setDocuments] = useState<BrandDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, startUploading] = useTransition();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, startDeleting] = useTransition();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const documentsData = await getBrandDocuments();
            setDocuments(documentsData);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Could not fetch your documents.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                redirect('/login');
            }
            fetchAllData();
        };

        checkUserAndFetchData();
    }, [toast]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (file && file.size > MAX_FILE_SIZE_BYTES) {
            toast({
                variant: 'destructive',
                title: 'File too large',
                description: `The maximum file size is ${MAX_FILE_SIZE_MB}MB.`,
            });
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            setSelectedFile(null);
            return;
        }
        setSelectedFile(file);
    };

    const handleDocumentUpload = async () => {
        if (!selectedFile) {
            toast({ variant: 'destructive', title: 'No file selected' });
            return;
        }

        const formData = new FormData();
        formData.append('document', selectedFile);

        startUploading(async () => {
            try {
                const result = await uploadBrandDocument(formData);
                toast({ title: 'Success!', description: result.message });
                setSelectedFile(null);
                if(fileInputRef.current) fileInputRef.current.value = "";
                await fetchAllData(); // Refresh documents list
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
            }
        });
    };

    const handleDocumentDelete = (id: string) => {
        setDeletingId(id);
        startDeleting(async () => {
            try {
                const result = await deleteBrandDocument(id);
                toast({ title: 'Success!', description: result.message });
                await fetchAllData(); // Refresh documents list
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Deletion failed', description: error.message });
            } finally {
                setDeletingId(null);
            }
        });
    };

    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold">Knowledge Base</h1>
                    <p className="text-muted-foreground">Manage your brand documents and power the RAG system.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Brand Documents</CardTitle>
                        <CardDescription>
                            Upload documents for the AI to learn from (e.g., brand guide, mission statement, product descriptions).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="document-upload">Upload a new document</Label>
                                <div className="flex items-center gap-2 mt-1">
                                     <Input
                                        id="document-upload"
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="flex-1"
                                        accept=".pdf,.docx,.txt"
                                        disabled={isUploading}
                                    />
                                     <Button 
                                        size="icon" 
                                        onClick={handleDocumentUpload} 
                                        disabled={!selectedFile || isUploading}
                                    >
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    </Button>
                                </div>
                                 <p className="text-xs text-muted-foreground mt-1">Max {MAX_FILE_SIZE_MB}MB. Supported formats: PDF, DOCX, TXT.</p>
                            </div>
                             <div className="space-y-3">
                                <h4 className="font-medium">Uploaded Documents</h4>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                    </div>
                                ) : documents.length > 0 ? (
                                    <ul className="divide-y divide-border rounded-md border">
                                        {documents.map(doc => (
                                            <li key={doc.id} className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                    <div className="flex-grow overflow-hidden">
                                                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Uploaded {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDocumentDelete(doc.id)}
                                                    disabled={isDeleting && deletingId === doc.id}
                                                >
                                                   {isDeleting && deletingId === doc.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    )}
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                                        <h3 className="mt-4 text-lg font-semibold">No documents uploaded yet.</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">Upload your first document to get started.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

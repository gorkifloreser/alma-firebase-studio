
'use client';

import React, { useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, FileText, Trash2, Loader2, Bot, User as UserIcon, CornerDownLeft, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { getBrandDocuments, deleteBrandDocument, uploadBrandDocument, askRag, parseDocument, generateAndStoreEmbeddings } from '../actions';


const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface ChatMessage {
    role: 'user' | 'bot';
    content: string;
}

type BrandDocument = Awaited<ReturnType<typeof getBrandDocuments>>[0];

export interface KnowledgeBaseClientPageProps {
    initialDocuments: BrandDocument[];
    getBrandDocumentsAction: typeof getBrandDocuments;
    deleteBrandDocumentAction: typeof deleteBrandDocument;
    uploadBrandDocumentAction: typeof uploadBrandDocument;
    askRagAction: typeof askRag;
    parseDocumentAction: typeof parseDocument;
    generateAndStoreEmbeddingsAction: typeof generateAndStoreEmbeddings;
}


export function KnowledgeBaseClientPage({
    initialDocuments,
    getBrandDocumentsAction,
    deleteBrandDocumentAction,
    uploadBrandDocumentAction,
    askRagAction,
    parseDocumentAction,
    generateAndStoreEmbeddingsAction,
}: KnowledgeBaseClientPageProps) {
    const [documents, setDocuments] = useState(initialDocuments);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, startUploading] = useTransition();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, startDeletingTransition] = useTransition();
    const [parsingId, setParsingId] = useState<string | null>(null);
    const [isParsing, startParsing] = useTransition();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatQuery, setChatQuery] = useState('');
    const [isAnswering, startAnswering] = useTransition();

    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
    const [parsingResult, setParsingResult] = useState<{chunks: string[], document_group_id: string} | null>(null);
    const [isStoring, startStoring] = useTransition();


    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const documentsData = await getBrandDocumentsAction();
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
                const result = await uploadBrandDocumentAction(formData);
                toast({ title: 'Success!', description: result.message });
                setSelectedFile(null);
                if(fileInputRef.current) fileInputRef.current.value = "";
                await fetchAllData();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
            }
        });
    };

    const handleDocumentDelete = (groupId: string) => {
        setDeletingId(groupId);
        startDeletingTransition(async () => {
            try {
                const result = await deleteBrandDocumentAction(groupId);
                toast({ title: 'Success!', description: result.message });
                await fetchAllData();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Deletion failed', description: error.message });
            } finally {
                setDeletingId(null);
            }
        });
    };

    const handleParseDocument = (filePath: string) => {
        setParsingId(filePath);
        startParsing(async () => {
            try {
                const result = await parseDocumentAction(filePath);
                setParsingResult(result);
                setIsResultDialogOpen(true);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Parsing Failed',
                    description: error.message,
                });
                 console.error('Parsing error details:', error);
            } finally {
                setParsingId(null);
            }
        });
    };

    const handleGenerateEmbeddings = async () => {
        if (!parsingResult || parsingResult.chunks.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Chunks to Process',
                description: 'There are no text chunks to generate embeddings for.',
            });
            return;
        }

        startStoring(async () => {
            try {
                const result = await generateAndStoreEmbeddingsAction(parsingResult.chunks, parsingResult.document_group_id);
                toast({
                    title: 'Success!',
                    description: result.message,
                });
                setIsResultDialogOpen(false);
                setParsingResult(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Embedding Failed',
                    description: error.message,
                });
            }
        });
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatQuery.trim()) return;

        const newUserMessage: ChatMessage = { role: 'user', content: chatQuery };
        setChatHistory(prev => [...prev, newUserMessage]);
        setChatQuery('');

        startAnswering(async () => {
            try {
                const result = await askRagAction(chatQuery);
                const newBotMessage: ChatMessage = { role: 'bot', content: result.response };
                setChatHistory(prev => [...prev, newBotMessage]);
            } catch (error: any) {
                const newErrorMessage: ChatMessage = { role: 'bot', content: `Error: ${error.message}` };
                setChatHistory(prev => [...prev, newErrorMessage]);
            }
        });
    }

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Brand Documents</CardTitle>
                        <CardDescription>
                            Upload documents for the AI to learn from. The system will automatically process them.
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
                                        accept=".pdf"
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
                                <p className="text-xs text-muted-foreground mt-1">Max {MAX_FILE_SIZE_MB}MB. Supported format: PDF.</p>
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
                                            <li key={doc.document_group_id} className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                    <div className="flex-grow overflow-hidden">
                                                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Uploaded {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleParseDocument(doc.file_path)}
                                                        disabled={isParsing && parsingId === doc.file_path}
                                                    >
                                                        {isParsing && parsingId === doc.file_path ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="h-4 w-4 mr-2" />
                                                        )}
                                                        Parse
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDocumentDelete(doc.document_group_id)}
                                                        disabled={isDeleting && deletingId === doc.document_group_id}
                                                    >
                                                    {isDeleting && deletingId === doc.document_group_id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        )}
                                                    </Button>
                                                </div>
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

            <Card className="sticky top-24">
                <CardHeader>
                    <CardTitle>Chat with your Knowledge Base</CardTitle>
                    <CardDescription>Ask questions about your uploaded documents.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="h-[400px] flex flex-col">
                        <div className="flex-1 overflow-y-auto pr-4 space-y-4">
                             {chatHistory.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <Bot className="w-12 h-12 text-muted-foreground" />
                                    <p className="mt-4 text-muted-foreground">Ask me anything about your brand!</p>
                                </div>
                            )}
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role === 'bot' && <Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback></Avatar>}
                                    <div className={`rounded-lg px-3 py-2 max-w-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                     {msg.role === 'user' && <Avatar className="w-8 h-8"><AvatarFallback><UserIcon className="w-5 h-5"/></AvatarFallback></Avatar>}
                                </div>
                            ))}
                            {isAnswering && (
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 flex-shrink-0"><Bot className="w-5 h-5" /></div>
                                    <div className="rounded-lg px-3 py-2 bg-muted flex items-center">
                                        <Sparkles className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleChatSubmit} className="relative mt-4">
                            <Textarea
                                value={chatQuery}
                                onChange={(e) => setChatQuery(e.target.value)}
                                placeholder="Type your question here..."
                                className="pr-16"
                                disabled={isAnswering}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleChatSubmit(e);
                                    }
                                }}
                            />
                            <Button type="submit" size="icon" className="absolute right-2 bottom-2 h-8 w-10" disabled={isAnswering || !chatQuery.trim()}>
                                {isAnswering ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
                            </Button>
                        </form>
                   </div>
                </CardContent>
            </Card>
        </div>
        <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Document Parsing Result</DialogTitle>
                    <DialogDescription>
                        The document was split into the following text chunks. Review them and then generate embeddings to add them to your knowledge base.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 p-4 my-4 border rounded-md">
                    {parsingResult?.chunks.map((chunk, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-md">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Chunk {index + 1}</p>
                            <p className="text-sm whitespace-pre-wrap">{chunk}</p>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleGenerateEmbeddings} disabled={isStoring}>
                        {isStoring ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Embeddings...
                            </>
                        ) : (
                             <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Embeddings & Save
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

const Avatar = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground", className)}>
        {children}
    </div>
);

const AvatarFallback = ({ children }: { children: React.ReactNode }) => <>{children}</>;

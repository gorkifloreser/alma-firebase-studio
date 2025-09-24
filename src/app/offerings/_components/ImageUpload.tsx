

'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { generateImageDescription, uploadSingleOfferingMedia, OfferingMedia } from '../actions';
import { Progress } from '@/components/ui/progress';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;

interface FileWithPreview extends File {
  preview: string;
}

interface UploadQueueItem {
    id: string;
    file: FileWithPreview;
    description: string;
    status: 'pending' | 'generating_desc' | 'uploading' | 'completed' | 'failed';
    progress: number;
    error?: string;
}

interface ExistingMedia {
    id: string;
    media_url: string;
    description?: string | null;
}

interface OfferingContext {
    title: string | null;
    description: string | null;
}

interface ImageUploadProps {
    offeringId: string | undefined;
    onNewMediaUploaded: (media: OfferingMedia) => void;
    existingMedia?: ExistingMedia[];
    onRemoveExistingMedia?: (mediaId: string) => void;
    offeringContext: OfferingContext;
}

const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_IMAGE_DIMENSION) {
            height *= MAX_IMAGE_DIMENSION / width;
            width = MAX_IMAGE_DIMENSION;
          }
        } else {
          if (height > MAX_IMAGE_DIMENSION) {
            width *= MAX_IMAGE_DIMENSION / height;
            height = MAX_IMAGE_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Canvas to Blob conversion failed'));
            resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
          },
          file.type,
          0.9
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export function ImageUpload({ offeringId, onNewMediaUploaded, existingMedia = [], onRemoveExistingMedia, offeringContext }: ImageUploadProps) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const { toast } = useToast();
  const [isProcessing, startProcessing] = useTransition();

  useEffect(() => {
    // Cleanup previews on unmount
    return () => {
        queue.forEach(item => URL.revokeObjectURL(item.file.preview));
    };
  }, [queue]);
  
  const processFile = useCallback(async (file: File, itemId: string) => {
    try {
        let processedFile = file;
        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast({ title: 'Resizing large image...', description: `"${file.name}" is being optimized.` });
            processedFile = await resizeImage(file);
        }

        // Step 1: Generate Description
        setQueue(prev => prev.map(item => item.id === itemId ? { ...item, status: 'generating_desc' } : item));
        const dataUri = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(processedFile);
        });

        const { description } = await generateImageDescription({
            imageDataUri: dataUri,
            contextTitle: offeringContext.title || '',
            contextDescription: offeringContext.description || '',
        });
        
        setQueue(prev => prev.map(item => item.id === itemId ? { ...item, description, status: 'uploading' } : item));

        // Step 2: Upload with description
        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('description', description);
        
        const newMedia = await uploadSingleOfferingMedia(offeringId!, formData); 
        
        setQueue(prev => prev.filter(item => item.id !== itemId)); // Remove from queue on success
        onNewMediaUploaded(newMedia); // Notify parent
        toast({ title: 'Upload Successful', description: `"${file.name}" has been uploaded.` });
        
    } catch (error: any) {
        console.error("Error processing file:", error);
        setQueue(prev => prev.map(item => item.id === itemId ? { ...item, status: 'failed', error: error.message } : item));
    }
  }, [offeringId, toast, onNewMediaUploaded, offeringContext]);

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[]) => {
    if (!offeringId) {
        toast({
            variant: 'destructive',
            title: 'Please Save Offering First',
            description: 'You must save the offering details before uploading media.',
        });
        return;
    }
    
    fileRejections.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
           toast({ variant: 'destructive', title: 'File error', description: `Could not accept "${file.name}": ${error.message}` });
      });
    });

    const newItems: UploadQueueItem[] = acceptedFiles.map(file => ({
        id: crypto.randomUUID(),
        file: Object.assign(file, { preview: URL.createObjectURL(file) }),
        description: '',
        status: 'pending',
        progress: 0,
    }));
    
    setQueue(prev => [...prev, ...newItems]);

    startProcessing(() => {
        newItems.forEach(item => processFile(item.file, item.id));
    });

  }, [toast, offeringId, processFile]);

  const removeItemFromQueue = (id: string) => {
    setQueue(prev => {
        const itemToRemove = prev.find(item => item.id === id);
        if (itemToRemove) URL.revokeObjectURL(itemToRemove.file.preview);
        return prev.filter(item => item.id !== id);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/gif': [], 'image/webp': [] },
    maxSize: MAX_FILE_SIZE_BYTES * 2, // Allow larger files for resizing
    disabled: !offeringId || isProcessing,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/50'}
        ${!offeringId ? 'cursor-not-allowed bg-muted/50' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-sm text-muted-foreground">
            {isDragActive ? 'Drop the files here ...' : "Drag 'n' drop files here, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {offeringId ? 'Images up to 50MB (larger images will be resized)' : 'Save the offering to enable uploads'}
          </p>
        </div>
      </div>

      {(existingMedia.length > 0 || queue.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {existingMedia.map((media) => (
            <div key={media.id} className="space-y-2">
              <div className="relative group aspect-square">
                <Image src={media.media_url} alt="Existing media" fill className="object-cover rounded-md" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={() => onRemoveExistingMedia?.(media.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                </div>
              </div>
               <p className="text-xs text-muted-foreground p-2 border rounded-md min-h-[60px]">
                {media.description || 'No description provided.'}
               </p>
            </div>
          ))}
          {queue.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="relative group aspect-square">
                <Image src={item.file.preview} alt={`Preview ${item.file.name}`} fill className="object-cover rounded-md" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md text-white">
                    {item.status === 'pending' && <p>Pending...</p>}
                    {item.status === 'generating_desc' && <div className="text-center p-2"><Sparkles className="h-6 w-6 mx-auto animate-spin" /><p className="text-xs mt-2">Writing description...</p></div>}
                    {item.status === 'uploading' && <div className="text-center p-2"><Loader2 className="h-6 w-6 mx-auto animate-spin" /><p className="text-xs mt-2">Uploading...</p></div>}
                    {item.status === 'failed' && (
                        <div className="text-center p-2">
                            <AlertCircle className="h-6 w-6 mx-auto text-destructive" />
                            <p className="text-xs mt-2 font-semibold">Upload Failed</p>
                            <p className="text-xs mt-1 text-red-300 line-clamp-2">{item.error}</p>
                        </div>
                    )}
                </div>
                 <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeItemFromQueue(item.id)}>
                    <X className="h-4 w-4" />
                </Button>
              </div>
               <p className="text-xs text-muted-foreground p-2 border rounded-md min-h-[60px]">
                {item.description || (item.status === 'generating_desc' ? 'Generating...' : 'Awaiting description...')}
               </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

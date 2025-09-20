

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { generateImageDescription } from '../actions';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface FileWithPreview extends File {
  preview: string;
}

interface FileWithDescription {
    file: FileWithPreview;
    description: string;
    isGeneratingDescription?: boolean;
}

interface ExistingMedia {
    id: string;
    url: string;
    description?: string | null;
}

interface ImageUploadProps {
    onFilesChange: (files: { file: File, description: string }[]) => void;
    existingMedia?: ExistingMedia[];
    onRemoveExistingMedia?: (mediaId: string) => void;
    isSaving: boolean;
}

export function ImageUpload({ onFilesChange, existingMedia = [], onRemoveExistingMedia, isSaving }: ImageUploadProps) {
  const [newFiles, setNewFiles] = useState<FileWithDescription[]>([]);
  const { toast } = useToast();

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleAutoDescription = async (index: number, file: File) => {
     setNewFiles(prev => {
        const updated = [...prev];
        if (updated[index]) updated[index].isGeneratingDescription = true;
        return updated;
    });
    try {
        const imageDataUri = await fileToDataUri(file);
        const result = await generateImageDescription({ imageDataUri });
        handleDescriptionChange(index, result.description);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Auto-description failed',
            description: error.message
        });
    } finally {
        setNewFiles(prev => {
            const updated = [...prev];
            if (updated[index]) updated[index].isGeneratingDescription = false;
            return updated;
        });
    }
  };

  useEffect(() => {
    onFilesChange(newFiles.map(item => ({ file: item.file, description: item.description })));
    // Cleanup function
    return () => {
        newFiles.forEach(item => URL.revokeObjectURL(item.file.preview));
    };
  }, [newFiles, onFilesChange]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            toast({
              variant: 'destructive',
              title: 'File too large',
              description: `"${file.name}" is larger than ${MAX_FILE_SIZE_MB}MB.`,
            });
          } else {
             toast({
              variant: 'destructive',
              title: 'File error',
              description: `Could not upload "${file.name}": ${error.message}`,
            });
          }
        });
      });
      return;
    }

    const filesWithPreviewAndDesc = acceptedFiles.map(file => ({
        file: Object.assign(file, { preview: URL.createObjectURL(file) }),
        description: '',
        isGeneratingDescription: false
    }));

    const currentFileCount = newFiles.length;
    setNewFiles(prev => [...prev, ...filesWithPreviewAndDesc]);
    
    filesWithPreviewAndDesc.forEach((item, index) => {
        handleAutoDescription(currentFileCount + index, item.file);
    });

  }, [toast, newFiles.length]);

  const removeNewFile = (index: number) => {
    setNewFiles(prev => {
        const newFilesList = [...prev];
        const removedItem = newFilesList.splice(index, 1)[0];
        URL.revokeObjectURL(removedItem.file.preview);
        return newFilesList;
    });
  };

  const handleDescriptionChange = (index: number, description: string) => {
    setNewFiles(prev => {
        const newFilesList = [...prev];
        newFilesList[index] = { ...newFilesList[index], description: description };
        return newFilesList;
    });
  };

  const handleRemoveExisting = (mediaId: string) => {
    if (onRemoveExistingMedia) {
        onRemoveExistingMedia(mediaId);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/gif': [],
      'image/webp': [],
      'image/svg+xml': [],
    },
    maxSize: MAX_FILE_SIZE_BYTES,
    disabled: isSaving,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/50'}
        ${isSaving ? 'cursor-not-allowed bg-muted/50' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-sm text-muted-foreground">
            {isDragActive
              ? 'Drop the files here ...'
              : "Drag 'n' drop some files here, or click to select files"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Images only, up to {MAX_FILE_SIZE_MB}MB</p>
        </div>
      </div>

      {(existingMedia.length > 0 || newFiles.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {existingMedia.map((media) => (
            <div key={media.id} className="space-y-2">
              <div className="relative group aspect-square">
                <Image
                  src={media.url}
                  alt="Existing media"
                  fill
                  className="object-cover rounded-md"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveExisting(media.id)}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                </div>
              </div>
               <Textarea
                    placeholder="Existing image description..."
                    defaultValue={media.description || ''}
                    className="text-xs h-20 resize-none"
                    disabled // Descriptions for existing media are read-only for now
                />
            </div>
          ))}
          {newFiles.map((item, index) => (
            <div key={item.file.name + index} className="space-y-2">
              <div className="relative group aspect-square">
                <Image
                  src={item.file.preview}
                  alt={`Preview ${index}`}
                  fill
                  className="object-cover rounded-md"
                  onLoad={() => URL.revokeObjectURL(item.file.preview)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeNewFile(index)}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                </div>
                {isSaving && (
                   <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                   </div>
                )}
              </div>
              <div className="relative">
                <Textarea
                    placeholder="Generating description..."
                    value={item.description}
                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                    className="text-xs h-20 resize-none pr-10"
                    disabled={isSaving || item.isGeneratingDescription}
                />
                {item.isGeneratingDescription && (
                    <div className="absolute top-2 right-2">
                        <Sparkles className="h-4 w-4 animate-spin text-primary" />
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

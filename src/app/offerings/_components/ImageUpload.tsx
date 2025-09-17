
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface FileWithPreview extends File {
  preview: string;
}

interface ExistingMedia {
    id: string;
    url: string;
}

interface ImageUploadProps {
    onFilesChange: (files: File[]) => void;
    existingMedia?: ExistingMedia[];
    onRemoveExistingMedia?: (mediaId: string) => void;
    isSaving: boolean;
}

export function ImageUpload({ onFilesChange, existingMedia = [], onRemoveExistingMedia, isSaving }: ImageUploadProps) {
  const [newFiles, setNewFiles] = useState<FileWithPreview[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Inform the parent component about file changes
    onFilesChange(newFiles);
    // Cleanup preview URLs
    return () => {
        newFiles.forEach(file => URL.revokeObjectURL(file.preview));
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

    const filesWithPreview = acceptedFiles.map(file => Object.assign(file, {
        preview: URL.createObjectURL(file)
    }));

    setNewFiles(prev => [...prev, ...filesWithPreview]);

  }, [toast]);

  const removeNewFile = (index: number) => {
    setNewFiles(prev => {
        const newFiles = [...prev];
        const removedFile = newFiles.splice(index, 1)[0];
        URL.revokeObjectURL(removedFile.preview);
        return newFiles;
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
           {existingMedia.map((media) => (
            <div key={media.id} className="relative group aspect-square">
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
          ))}
          {newFiles.map((file, index) => (
            <div key={file.name + index} className="relative group aspect-square">
              <Image
                src={file.preview}
                alt={`Preview ${index}`}
                fill
                className="object-cover rounded-md"
                onLoad={() => URL.revokeObjectURL(file.preview)}
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
          ))}
        </div>
      )}
    </div>
  );
}

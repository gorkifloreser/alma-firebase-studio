
'use client';

import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function ImageUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();

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

    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);

  }, [files, toast]);

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    
    newFiles.splice(index, 1);
    const removedPreview = newPreviews.splice(index, 1)[0];
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    URL.revokeObjectURL(removedPreview);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/gif': [],
      'image/webp': [],
    },
    maxSize: MAX_FILE_SIZE_BYTES,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/50'}`}
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

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square">
              <Image
                src={preview}
                alt={`Preview ${index}`}
                fill
                className="object-cover rounded-md"
                onLoad={() => URL.revokeObjectURL(preview)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

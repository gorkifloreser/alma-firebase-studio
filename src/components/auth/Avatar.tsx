
'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function Avatar({
  url,
  isUploading,
  onFileSelect,
}: {
  url: string | null | undefined
  isUploading: boolean
  onFileSelect: (file: File | null) => void
}) {
  const { toast } = useToast()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    setAvatarPreview(url || null)
  }, [url])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(null);
    setAvatarPreview(null);
    
    if (!event.target.files || event.target.files.length === 0) {
      return
    }
    const file = event.target.files[0]
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
            title: 'File too large',
            description: 'Please select an image smaller than 2MB.',
            variant: 'destructive',
        });
        event.target.value = ''; // Clear the input
        return;
    }
    setAvatarPreview(URL.createObjectURL(file))
    onFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    onFileSelect(null);
    setAvatarPreview(null);
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0];
       if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({
                title: 'File too large',
                description: 'Please select an image smaller than 2MB.',
                variant: 'destructive',
            });
            return;
        }
      setAvatarPreview(URL.createObjectURL(file));
      onFileSelect(file);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <label
          htmlFor="avatar-upload"
          className={`relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed 
          ${isDragOver ? 'border-primary' : 'border-input'} 
          bg-muted transition-all ${isUploading ? 'cursor-not-allowed' : 'hover:border-primary'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Avatar Preview"
              className="h-full w-full rounded-full object-cover"
              width={96}
              height={96}
            />
          ) : (
             <div className="text-center text-xs text-muted-foreground">
                <Camera className="mx-auto h-6 w-6"/>
                <p>Drag & Drop or click to upload</p>
             </div>
          )}
          {!isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100">
               <Camera className="h-8 w-8 text-white" />
            </div>
          )}
           {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/70">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          )}
        </label>
        <input
          id="avatar-upload"
          name="avatar"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>
    </div>
  )
}

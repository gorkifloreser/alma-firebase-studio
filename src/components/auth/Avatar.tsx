
'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function Avatar({
  url,
  isUploading,
  onFileSelect,
  accept = "image/png, image/jpeg, image/gif",
}: {
  url: string | null | undefined
  isUploading: boolean
  onFileSelect: (file: File | null) => void
  accept?: string
}) {
  const { toast } = useToast()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // This ref is to allow clearing the file input
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    // When the `url` prop changes (e.g., after a successful upload),
    // and if we are not showing a local blob preview, update the preview.
    // If the new URL is null/undefined, it means we should clear the preview.
    if (!avatarPreview?.startsWith('blob:')) {
      setAvatarPreview(url || null);
    }
    // If the upload is finished (isUploading becomes false) and we have a new URL from the server,
    // clear the file input to prevent re-uploading the same file on the next save.
    if (!isUploading && url && fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }, [url, isUploading, avatarPreview])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 2MB.',
          variant: 'destructive',
        })
        onFileSelect(null);
        // Clear the file input
        if(fileInputRef.current) fileInputRef.current.value = "";
        return
      }
      setAvatarPreview(URL.createObjectURL(file))
      onFileSelect(file)
    }
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
    const file = e.dataTransfer.files?.[0]
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({
                title: 'File too large',
                description: 'Please select an image smaller than 2MB.',
                variant: 'destructive',
            })
            onFileSelect(null);
            return
        }
        setAvatarPreview(URL.createObjectURL(file))
        onFileSelect(file)
        if(fileInputRef.current) {
            // Assign the dropped file to the file input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;
        }
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <label
          htmlFor="avatar-upload"
          className={`relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed 
          ${isDragOver ? 'border-primary' : 'border-input'} 
          bg-muted transition-all`}
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
             <div className="text-center text-xs text-muted-foreground p-2">
                <Camera className="mx-auto h-6 w-6"/>
                <p>Drag & drop or click</p>
             </div>
          )}

          {/* Overlay for idle state */}
          {!isUploading && (
             <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100">
               <Camera className="h-8 w-8 text-white" />
            </div>
          )}

          {/* Overlay for uploading state */}
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/70 p-2">
               <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          )}
        </label>
        <input
          ref={fileInputRef}
          id="avatar-upload"
          name="avatar-input"
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>
    </div>
  )
}

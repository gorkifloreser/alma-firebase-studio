
'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function Avatar({
  userId,
  url,
  onUpload,
}: {
  userId: string | null | undefined
  url: string | null | undefined
  onUpload: (url: string) => void
}) {
  const { toast } = useToast()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    setAvatarUrl(url || null)
  }, [url])

  const handleUpload = async (file: File) => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload an avatar.',
        variant: 'destructive',
      })
      return
    }
    
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME;
    if (!bucketName) {
        toast({
            title: 'Configuration Error',
            description: 'Storage bucket name is not configured.',
            variant: 'destructive',
        });
        return;
    }

    try {
      setIsUploading(true)
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}/${userId}-${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })
      
      if (uploadError) {
        throw uploadError
      }
      
      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(data.path)

      setAvatarUrl(publicUrl) // Update local preview with the final URL
      onUpload(publicUrl) // Pass the final URL to the parent component

      toast({
        title: 'Success!',
        description: 'Avatar uploaded. Remember to save your changes.',
      })
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }
    const file = event.target.files[0]
    setAvatarUrl(URL.createObjectURL(file)) // Show local preview immediately
    handleUpload(file) // Start the upload
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
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0];
      setAvatarUrl(URL.createObjectURL(file)); // Show local preview
      handleUpload(file); // Start the upload
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
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
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
                <span className="absolute text-xs font-bold text-white">{uploadProgress}%</span>
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

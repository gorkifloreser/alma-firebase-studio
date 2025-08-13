
'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Camera, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Progress } from '@/components/ui/progress'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function Avatar({
  url,
  onUploadComplete,
}: {
  url: string | null | undefined
  onUploadComplete: (url: string) => void
}) {
  const { toast } = useToast()
  const supabase = createClient()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')

  useEffect(() => {
    setAvatarPreview(url || null)
  }, [url])
  
  const resetState = () => {
    setUploadProgress(0)
    setUploadStatus('idle')
    setAvatarPreview(url || null) // Revert to original avatar on error/cancel
  }

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 2MB.',
        variant: 'destructive',
      })
      return
    }

    setUploadStatus('uploading');
    setAvatarPreview(URL.createObjectURL(file));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setUploadStatus('error');
        toast({ title: 'Not authenticated', description: 'You must be logged in to upload an avatar.', variant: 'destructive' });
        return;
    }
    
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME;
    if (!bucketName) {
        setUploadStatus('error');
        toast({ title: 'Configuration error', description: 'Storage bucket is not configured.', variant: 'destructive' });
        return;
    }

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${user.id}-${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      setUploadStatus('error');
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      // Revert preview after a delay
      setTimeout(() => resetState(), 3000);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    setUploadStatus('success');
    onUploadComplete(publicUrl);
    toast({ title: 'Success!', description: 'Avatar updated. Remember to save your profile changes.' });
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleFileSelect(file)
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
    if (file) handleFileSelect(file)
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
          {uploadStatus === 'idle' && (
             <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100">
               <Camera className="h-8 w-8 text-white" />
            </div>
          )}

          {/* Overlay for uploading state */}
          {uploadStatus === 'uploading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/70 p-2">
               <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          )}
            
          {/* Overlay for success state */}
          {uploadStatus === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-green-500/80">
                <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
          )}
            
          {/* Overlay for error state */}
          {uploadStatus === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-destructive/80">
                <AlertTriangle className="h-10 w-10 text-destructive-foreground" />
            </div>
          )}

        </label>
        <input
          id="avatar-upload"
          name="avatar-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploadStatus === 'uploading'}
        />
      </div>
    </div>
  )
}

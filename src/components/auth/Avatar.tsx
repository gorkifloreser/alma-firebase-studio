
'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'

export function Avatar({
  url,
  onUpload,
}: {
  url: string | null | undefined
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    setAvatarUrl(url || null)
  }, [url])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }
    const file = event.target.files[0]
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)
    setIsUploading(true)
    onUpload(event)
    setIsUploading(false)
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
      const input = document.getElementById('avatar-upload') as HTMLInputElement
      if (input) {
        input.files = files
        const changeEvent = new Event('change', { bubbles: true })
        input.dispatchEvent(changeEvent)
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
          bg-muted transition-all hover:border-primary`}
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
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100">
             <Camera className="h-8 w-8 text-white" />
          </div>
          {isUploading && (
             <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/70">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
             </div>
          )}
        </label>
        <input
          id="avatar-upload"
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

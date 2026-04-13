"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import ImageViewerDialog from './ImageViewerDialog';

type InspirationImage = {
  id: number;
  url: string;
};

const InspirationBoard = () => {
  const [images, setImages] = useState<InspirationImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      const newImages = filesArray.map(file => ({
        id: Date.now() + Math.random(),
        url: URL.createObjectURL(file),
      }));
      setImages(prevImages => [...prevImages, ...newImages]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    setImages(images.filter(img => img.id !== id));
  };

  const openImageViewer = (index: number) => {
    setStartIndex(index);
    setIsViewerOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Inspirations</CardTitle>
          <Button onClick={handleUploadClick} size="sm" className="bg-brand-yellow hover:bg-yellow-400 text-black">
            <Upload className="mr-2 h-4 w-4" /> Téléverser
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            multiple
          />
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 p-1 border rounded-md overflow-x-auto h-[150px]">
            {images.map((image, index) => (
              <div key={image.id} className="relative group flex-shrink-0 w-32 h-32 cursor-pointer" onClick={() => openImageViewer(index)}>
                <img src={image.url} alt="Inspiration" className="w-full h-full object-cover rounded-md" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemoveImage(e, image.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <ImageViewerDialog
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={images}
        startIndex={startIndex}
      />
    </>
  );
};

export default InspirationBoard;
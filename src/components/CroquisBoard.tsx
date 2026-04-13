"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";
import ImageViewerDialog from './ImageViewerDialog';
import DrawingDialog from './DrawingDialog';

type SketchImage = {
  id: number;
  url: string;
};

const CroquisBoard = () => {
  const [images, setImages] = useState<SketchImage[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const handleSaveSketch = (dataUrl: string) => {
    const newSketch = {
      id: Date.now(),
      url: dataUrl,
    };
    setImages(prevImages => [...prevImages, newSketch]);
  };

  const handleRemoveImage = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
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
          <CardTitle className="text-lg">Croquis</CardTitle>
          <Button onClick={() => setIsDrawingOpen(true)} size="sm" className="bg-brand-yellow hover:bg-yellow-400 text-black">
            <Pencil className="mr-2 h-4 w-4" /> Créer
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 p-1 border rounded-md overflow-x-auto h-[150px]">
            {images.map((image, index) => (
              <div key={image.id} className="relative group flex-shrink-0 w-32 h-32 cursor-pointer" onClick={() => openImageViewer(index)}>
                <img src={image.url} alt="Croquis" className="w-full h-full object-cover rounded-md bg-white" />
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
      <DrawingDialog
        isOpen={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
        onSave={handleSaveSketch}
      />
    </>
  );
};

export default CroquisBoard;
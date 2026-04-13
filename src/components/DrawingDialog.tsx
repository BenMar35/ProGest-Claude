"use client";

import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CanvasDraw from "react-canvas-draw";
import { Undo, Trash2, Pencil, Eraser } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface DrawingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

const DrawingDialog = ({ isOpen, onClose, onSave }: DrawingDialogProps) => {
  const canvasRef = useRef<CanvasDraw>(null);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushRadius, setBrushRadius] = useState(2);

  const activeBrushColor = tool === 'pencil' ? brushColor : '#FFFFFF';

  const handleSave = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.getDataURL("image/png", false, "#FFFFFF");
      onSave(dataUrl);
      onClose();
    }
  };

  const handleUndo = () => canvasRef.current?.undo();
  const handleClear = () => canvasRef.current?.clear();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Créer un croquis</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-wrap items-center justify-between gap-4 p-2 border rounded-md bg-slate-50">
          <div className="flex items-center gap-2">
            <Button variant={tool === 'pencil' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTool('pencil')}>
              <Pencil className="mr-2 h-4 w-4" /> Crayon
            </Button>
            <Button variant={tool === 'eraser' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTool('eraser')}>
              <Eraser className="mr-2 h-4 w-4" /> Gomme
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="color-picker">Couleur:</Label>
            <Input
              id="color-picker"
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-12 h-8 p-1"
              disabled={tool === 'eraser'}
            />
          </div>
          <div className="flex items-center gap-2 w-48">
            <Label>Taille: {brushRadius}</Label>
            <Slider
              min={1}
              max={50}
              step={1}
              value={[brushRadius]}
              onValueChange={(value) => setBrushRadius(value[0])}
            />
          </div>
        </div>

        <div className="border rounded-md my-2 flex justify-center items-center bg-white">
            <CanvasDraw
              ref={canvasRef}
              brushRadius={brushRadius}
              brushColor={activeBrushColor}
              lazyRadius={0}
              canvasWidth={800}
              canvasHeight={500}
              immediate
              hideGrid
            />
        </div>

        <DialogFooter className="flex-row justify-between items-center">
          <div>
            <Button onClick={handleUndo} variant="outline" className="mr-2">
              <Undo className="mr-2 h-4 w-4" /> Annuler
            </Button>
            <Button onClick={handleClear} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Effacer
            </Button>
          </div>
          <div>
            <DialogClose asChild>
              <Button variant="ghost">Fermer</Button>
            </DialogClose>
            <Button onClick={handleSave} className="bg-brand-yellow hover:bg-yellow-400 text-black">Enregistrer</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DrawingDialog;
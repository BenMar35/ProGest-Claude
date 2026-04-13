"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_COMMENT_WIDTH = 300;
const MIN_WIDTH = 100;

interface UseOptimalColumnWidthsProps {
  numOffers: number;
}

interface UseOptimalColumnWidthsReturn {
  commentWidths: number[];
  handleMouseDown: (index: number, e: React.MouseEvent) => void;
}

export const useOptimalColumnWidths = ({ numOffers }: UseOptimalColumnWidthsProps): UseOptimalColumnWidthsReturn => {
  const [commentWidths, setCommentWidths] = useState<number[]>([]);
  const resizingRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  // 1. Initialization: Calculate widths once based on numOffers
  useEffect(() => {
    setCommentWidths(currentWidths => {
      const newWidths = Array(numOffers).fill(DEFAULT_COMMENT_WIDTH);
      // Preserve existing widths if the number of offers decreases or stays the same
      for (let i = 0; i < Math.min(currentWidths.length, numOffers); i++) {
        newWidths[i] = currentWidths[i];
      }
      return newWidths;
    });
  }, [numOffers]); // Recalculate only when numOffers changes

  // 2. Resizing Logic (Mouse Handlers)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { index, startX, startWidth } = resizingRef.current;
    const newWidth = startWidth + (e.clientX - startX);
    
    if (newWidth > MIN_WIDTH) {
      setCommentWidths(prev => {
        const newWidths = [...prev];
        newWidths[index] = newWidth;
        return newWidths;
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    resizingRef.current = {
      index,
      startX: e.clientX,
      startWidth: commentWidths[index],
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return {
    commentWidths,
    handleMouseDown,
  };
};
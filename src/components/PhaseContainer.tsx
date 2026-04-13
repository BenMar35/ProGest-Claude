"use client";

import React, { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhaseContainerProps {
  phaseName: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isLastPhase: boolean;
  onWidthChange: (name: string, width: number) => void;
}

const PhaseContainer = ({
  phaseName,
  children,
  isOpen,
  onToggle,
  isLastPhase,
  onWidthChange,
}: PhaseContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !isOpen) return;

    // Utilisation de ResizeObserver pour ne signaler la largeur que si elle change réellement
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // On utilise scrollWidth pour capturer la largeur réelle du contenu
        const width = containerRef.current?.scrollWidth || 0;
        onWidthChange(phaseName, width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen, phaseName, onWidthChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col items-start h-full",
        isOpen ? "px-5" : "w-12",
        "transition-all duration-300 ease-in-out"
      )}
    >
      {/* Phase Title */}
      <div className={cn(
        "absolute top-0 left-0 py-2",
        isOpen ? "block" : "hidden"
      )}>
        <h2 className="text-2xl font-bold text-black whitespace-nowrap">{phaseName}</h2>
      </div>

      {/* Phase Content */}
      <div
        className={cn(
          "pt-[100px] transition-all duration-300 ease-in-out h-full w-full",
          isOpen ? "block opacity-100 overflow-x-auto" : "hidden opacity-0 w-0"
        )}
      >
        {children}
      </div>

      {/* Toggle Button */}
      {!isLastPhase && (
        <button
          className={cn(
            "absolute top-[100px] -right-6 bg-brand-yellow hover:bg-yellow-400 text-black h-8 w-8 z-10 rounded-full border border-input flex items-center justify-center shadow-sm",
            "transition-transform active:scale-95"
          )}
          onClick={onToggle}
        >
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
};

export default PhaseContainer;
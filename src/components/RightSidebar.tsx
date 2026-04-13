"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_CONTENT_WIDTH, BUTTON_WIDTH, BUTTON_HEIGHT } from "@/lib/constants"; // Importation des constantes

const RightSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <React.Fragment>
      {/* Sidebar Content Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-brand-cream text-black z-30 transition-transform duration-300 ease-in-out p-4 overflow-y-auto`}
        style={{
          width: SIDEBAR_CONTENT_WIDTH,
          transform: isOpen ? 'translateX(0)' : `translateX(${SIDEBAR_CONTENT_WIDTH})` // Content slides fully out to the right
        }}
      >
        <div className="border-b pb-2 mb-4 border-gray-400">
          <h2 className="text-2xl font-bold">Avancement projet</h2>
        </div>
        <div>
          <p>Contenu à venir...</p>
        </div>
      </div>

      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed top-[100px] bg-brand-yellow hover:bg-yellow-400 text-black rounded-md z-40", // Increased z-index to ensure it's on top
        )}
        style={{
          right: isOpen ? `calc(${SIDEBAR_CONTENT_WIDTH} - 6px)` : `calc(0px - ${BUTTON_WIDTH} + 6px)`, // Adjusted for 6px overlap
          transition: 'right 300ms ease-in-out',
          width: BUTTON_WIDTH, // Apply width from constants
          height: BUTTON_HEIGHT, // Apply height from constants
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </Button>
    </React.Fragment>
  );
};

export default RightSidebar;
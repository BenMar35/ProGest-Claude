"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimePickerButtonProps {
  time: string;
  setTime: (time: string) => void;
  disabled?: boolean; // Added disabled prop
}

export function TimePickerButton({ time, setTime, disabled = false }: TimePickerButtonProps) {
  const inputId = React.useId();

  return (
    <div className="relative w-full h-full">
      <label
        htmlFor={inputId}
        className={cn(
          "w-full h-full flex items-center justify-center text-xs font-normal p-1 text-black border-0 rounded-md cursor-pointer",
          time ? "bg-brand-cream-light hover:bg-brand-cream" : "bg-brand-yellow hover:bg-yellow-400"
        )}
      >
        {time || <Clock className="h-4 w-4" />}
      </label>
      <Input
        id={inputId}
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Select time"
        disabled={disabled}
      />
    </div>
  );
}
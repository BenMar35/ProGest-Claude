"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerButtonProps {
  date: string; // Storing date as string 'YYYY-MM-DD'
  setDate: (date: string) => void;
  disabled?: boolean;
}

export function DatePickerButton({ date, setDate, disabled = false }: DatePickerButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const dateObj = date ? new Date(`${date}T00:00:00`) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const isoString = selectedDate.toISOString().split('T')[0];
      setDate(isoString);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full h-full text-xs justify-center font-normal p-1 text-black border-0 rounded-md",
            date ? "bg-brand-cream-light hover:bg-brand-cream" : "bg-brand-yellow hover:bg-yellow-400",
            "disabled:opacity-70 disabled:bg-gray-200 disabled:cursor-not-allowed"
          )}
        >
          {date ? format(dateObj!, 'dd/MM/yy', { locale: fr }) : <CalendarIcon className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={dateObj}
          onSelect={handleSelect}
          initialFocus
          locale={fr}
        />
      </PopoverContent>
    </Popover>
  );
}
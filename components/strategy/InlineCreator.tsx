"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ChevronsRight } from "lucide-react";

interface InlineCreatorProps {
  placeholder?: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  buttonText?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function InlineCreator({
  placeholder = "Enter title...",
  onSave,
  onCancel,
  buttonText = "Add Item",
  icon,
  className,
}: InlineCreatorProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSave(value.trim());
      setValue("");
    }
  };

  return (
    <div
      className={`bg-card border rounded-md p-3 shadow-sm animate-in fade-in zoom-in-95 duration-200 ${className}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          autoFocus
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9"
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-8 gap-2"
            disabled={!value.trim()}
          >
            {icon || <Plus className="h-3 w-3" />}
            {buttonText}
          </Button>
        </div>
      </form>
    </div>
  );
}

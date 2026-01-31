"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Save, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NoteEditorProps {
  goalId?: string;
  keyStepId?: string;
  dayPlanId?: string;
  title?: string; // Context title (e.g. Goal Name)
  trigger?: React.ReactNode;
}

export function NoteEditor({
  goalId,
  keyStepId,
  dayPlanId,
  title,
  trigger,
}: NoteEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const utils = trpc.useUtils();

  const { data: notes, isLoading } = trpc.note.getNotes.useQuery(
    { goalId, keyStepId, dayPlanId },
    { enabled: isOpen },
  );

  const createNote = trpc.note.createNote.useMutation({
    onSuccess: () => {
      setNewNote("");
      toast.success("Note added");
      utils.note.getNotes.invalidate();
    },
  });

  const deleteNote = trpc.note.deleteNote.useMutation({
    onSuccess: () => {
      toast.success("Note deleted");
      utils.note.getNotes.invalidate();
    },
  });

  const handleSave = () => {
    if (!newNote.trim()) return;
    createNote.mutate({
      content: newNote,
      goalId,
      keyStepId,
      dayPlanId,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] flex flex-col h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-col text-start ">
            <FileText className="h-5 w-5 text-primary" />
            Notes{" "}
            {title && (
              <span className="text-muted-foreground font-normal text-sm">
                {title}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {/* Create New Note */}
          <div className="space-y-2">
            <Textarea
              placeholder="Type your note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <Button
              onClick={handleSave}
              disabled={!newNote.trim() || createNote.isPending}
              className="w-full"
              size="sm"
            >
              {createNote.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Note
            </Button>
          </div>

          <div className="border-t my-2" />

          {/* List Notes */}
          <div className="flex-1 min-h-0">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">
              History
            </h4>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {notes && notes.length > 0 ? (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-muted/30 p-3 rounded-md border text-sm group relative"
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>
                            {format(
                              new Date(note.createdAt),
                              "MMM d, yyyy h:mm a",
                            )}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                            onClick={() => deleteNote.mutate({ id: note.id })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground opacity-60 italic">
                      No notes yet.
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

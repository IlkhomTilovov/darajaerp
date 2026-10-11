import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Stages where task is NOT required (only comment is mandatory).
// Matched by name rather than id, since stage ids are generated per-environment.
const TASK_OPTIONAL_STAGE_NAMES = ["Sotildi", "Keyin oladi", "Sifatsiz", "Olmaydi"];

interface StageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  newStageId: string;
  newStageName: string;
  sellerId: string;
  onSuccess: () => void;
}

export function StageChangeDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  newStageId,
  newStageName,
  sellerId,
  onSuccess,
}: StageChangeDialogProps) {
  const [comment, setComment] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDate, setTaskDate] = useState<Date | undefined>(undefined);
  const [taskTime, setTaskTime] = useState("12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTaskOptional = TASK_OPTIONAL_STAGE_NAMES.includes(newStageName);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Izoh yozish majburiy!");
      return;
    }

    // Task is required only for non-optional stages
    if (!isTaskOptional) {
      if (!taskTitle.trim()) {
        toast.error("Vazifa nomi majburiy!");
        return;
      }

      if (!taskDate) {
        toast.error("Vazifa muddatini tanlang!");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Save comment
      await api.leads.comments.create(leadId, comment.trim());

      // 2. Create task with time (only if task fields are filled or required)
      if (taskTitle.trim() && taskDate) {
        const [hours, minutes] = taskTime.split(":").map(Number);
        const dueDate = new Date(taskDate);
        dueDate.setHours(hours, minutes, 0, 0);

        await api.tasks.create({
          lead_id: leadId,
          seller_id: sellerId,
          title: taskTitle.trim(),
          description: taskDescription.trim() || null,
          due_date: dueDate.toISOString(),
          status: "pending",
        });
      }

      // 3. Update lead stage
      await api.leads.update(leadId, { stage: newStageId });

      toast.success(`Lid "${newStageName}" bosqichiga o'tkazildi`);
      
      // Reset form
      setComment("");
      setTaskTitle("");
      setTaskDescription("");
      setTaskDate(undefined);
      setTaskTime("12:00");
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComment("");
    setTaskTitle("");
    setTaskDescription("");
    setTaskDate(undefined);
    setTaskTime("12:00");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Bosqichni o'zgartirish: {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            "{newStageName}" bosqichiga o'tkazish uchun izoh {!isTaskOptional && "va vazifa qo'shish "}majburiy.
          </p>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Izoh *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Izoh yozing..."
              rows={3}
            />
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="taskTitle">Vazifa nomi {!isTaskOptional && "*"}</Label>
            <Input
              id="taskTitle"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder={isTaskOptional ? "Vazifa nomini kiriting (ixtiyoriy)" : "Vazifa nomini kiriting"}
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="taskDescription">Vazifa tavsifi</Label>
            <Textarea
              id="taskDescription"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Vazifa tavsifini kiriting (ixtiyoriy)"
              rows={2}
            />
          </div>

          {/* Task Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Muddat {!isTaskOptional && "*"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !taskDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {taskDate ? format(taskDate, "dd.MM.yyyy") : "Sana tanlang"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={taskDate}
                    onSelect={setTaskDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskTime">Vaqt {!isTaskOptional && "*"}</Label>
              <Input
                id="taskTime"
                type="time"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Bekor qilish
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

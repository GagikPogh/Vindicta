"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NODE_TYPE_CONFIG, useWebStore } from "@/stores/web-store";

export function WebToolbar() {
  const addNode = useWebStore((s) => s.addNode);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [nodeType, setNodeType] = useState("person");

  const handleQuickAdd = (type: string) => {
    const config = NODE_TYPE_CONFIG[type];
    addNode(type, `Новый: ${config.label}`);
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    addNode(nodeType, label.trim());
    setLabel("");
    setDialogOpen(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Добавить</span>
            </Button>
          }
        />
        <DropdownMenuContent className="glass-strong w-48">
          {Object.entries(NODE_TYPE_CONFIG).map(([key, cfg]) => (
            <DropdownMenuItem key={key} onClick={() => handleQuickAdd(key)}>
              <span className="mr-2">{cfg.emoji}</span>
              {cfg.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger
          render={
            <Button size="sm" variant="outline" className="hidden sm:flex">
              По имени
            </Button>
          }
        />
        <DialogContent className="glass-strong border-glass-border">
          <DialogHeader>
            <DialogTitle>Новый узел расследования</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCustomAdd} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Имя / событие / улика</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Иван Петров, Встреча 15.03..."
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(NODE_TYPE_CONFIG).slice(0, 6).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNodeType(key)}
                  className={`p-2 rounded-xl text-xs border transition-colors ${
                    nodeType === key
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-glass-border hover:bg-accent"
                  }`}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
            <Button type="submit" className="w-full">Добавить в паутину</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

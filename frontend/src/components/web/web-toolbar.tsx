"use client";

import { useMemo, useState } from "react";
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
import {
  getWebMessages,
  WEB_NODE_TYPES,
  type WebLocale,
} from "@/lib/i18n/web";
import { NODE_TYPE_CONFIG, useWebStore } from "@/stores/web-store";

interface WebToolbarProps {
  locale?: WebLocale;
}

export function WebToolbar({ locale = "en" }: WebToolbarProps) {
  const addNode = useWebStore((s) => s.addNode);
  const t = useMemo(() => getWebMessages(locale), [locale]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [nodeType, setNodeType] = useState<string>("person");

  const handleQuickAdd = (type: string) => {
    addNode(type, `${t.newPrefix}: ${t.nodeTypes[type as keyof typeof t.nodeTypes]}`);
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
          nativeButton={false}
          render={
            <Button size="sm" className="gap-1" nativeButton>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.add}</span>
            </Button>
          }
        />
        <DropdownMenuContent className="glass-strong w-52">
          {WEB_NODE_TYPES.map((key) => (
            <DropdownMenuItem key={key} onClick={() => handleQuickAdd(key)}>
              <span className="mr-2">{NODE_TYPE_CONFIG[key].emoji}</span>
              {t.nodeTypes[key]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger
          nativeButton={false}
          render={
            <Button size="sm" variant="outline" className="hidden sm:flex" nativeButton>
              {t.addByName}
            </Button>
          }
        />
        <DialogContent className="glass-strong border-glass-border">
          <DialogHeader>
            <DialogTitle>{t.newNode}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCustomAdd} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t.nameLabel}</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t.namePlaceholder}
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {WEB_NODE_TYPES.map((key) => (
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
                  {NODE_TYPE_CONFIG[key].emoji} {t.nodeTypes[key]}
                </button>
              ))}
            </div>
            <Button type="submit" className="w-full">{t.addToGraph}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

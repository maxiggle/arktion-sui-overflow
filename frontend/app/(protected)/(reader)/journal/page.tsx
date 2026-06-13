"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  BookMarked,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJournalStore } from "@/stores/journal.store";
import { FORMAT_LABELS, FormatType } from "@/lib/types/series";
import {
  createJournalSchema,
  updateJournalSchema,
} from "@/lib/types/journal";
import type { JournalEntryDto } from "@/lib/types/journal";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldErrors = Record<string, string | undefined>;

type CreateForm = {
  externalTitle: string;
  formatType: string;
  externalUrl: string;
  totalChapters: string;
  currentChapter: string;
  notes: string;
};

type UpdateForm = {
  currentChapter: string;
  totalChapters: string;
  notes: string;
};

const FORMAT_OPTIONS = [
  { value: FormatType.NOVEL, label: "Novel" },
  { value: FormatType.MANGA, label: "Manga" },
  { value: FormatType.MANHWA, label: "Manhwa" },
  { value: FormatType.MANHUA, label: "Manhua" },
  { value: FormatType.WEBTOON, label: "Webtoon" },
] as const;

const BLANK_CREATE: CreateForm = {
  externalTitle: "",
  formatType: String(FormatType.MANGA),
  externalUrl: "",
  totalChapters: "0",
  currentChapter: "0",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function progressLabel(entry: JournalEntryDto): string {
  if (entry.totalChapters > 0) {
    return `ch ${entry.currentChapter} / ${entry.totalChapters}`;
  }
  if (entry.currentChapter > 0) {
    return `ch ${entry.currentChapter}`;
  }
  return "not started";
}

function progressPct(entry: JournalEntryDto): number {
  if (entry.totalChapters <= 0) return 0;
  return Math.min(100, Math.round((entry.currentChapter / entry.totalChapters) * 100));
}

// ─── Field error helper ───────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive mt-1">{message}</p>;
}

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { create } = useJournalStore();
  const [form, setForm] = useState<CreateForm>(BLANK_CREATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set(field: keyof CreateForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const result = createJournalSchema.safeParse({
      externalTitle: form.externalTitle.trim(),
      formatType: form.formatType,
      externalUrl: form.externalUrl.trim(),
      totalChapters: form.totalChapters,
      currentChapter: form.currentChapter,
      notes: form.notes.trim() || undefined,
    });

    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(flat).map(([k, v]) => [k, v?.[0]])
        )
      );
      return;
    }

    setSubmitting(true);
    try {
      await create(result.data);
      setForm(BLANK_CREATE);
      setErrors({});
      onClose();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setForm(BLANK_CREATE);
    setErrors({});
    setServerError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add journal entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Title */}
          <div>
            <Label htmlFor="jTitle" className="text-xs">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="jTitle"
              value={form.externalTitle}
              onChange={(e) => set("externalTitle", e.target.value)}
              placeholder="One Piece"
              className="mt-1.5"
              maxLength={500}
            />
            <FieldError message={errors.externalTitle} />
          </div>

          {/* Format + URL — two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Format <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.formatType}
                onValueChange={(v) => set("formatType", v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.formatType} />
            </div>

            <div>
              <Label htmlFor="jUrl" className="text-xs">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jUrl"
                type="url"
                value={form.externalUrl}
                onChange={(e) => set("externalUrl", e.target.value)}
                placeholder="https://..."
                className="mt-1.5"
              />
              <FieldError message={errors.externalUrl} />
            </div>
          </div>

          {/* Progress — two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="jCurrent" className="text-xs">
                Current chapter
              </Label>
              <Input
                id="jCurrent"
                type="number"
                min={0}
                value={form.currentChapter}
                onChange={(e) => set("currentChapter", e.target.value)}
                className="mt-1.5"
              />
              <FieldError message={errors.currentChapter} />
            </div>
            <div>
              <Label htmlFor="jTotal" className="text-xs">
                Total chapters
              </Label>
              <Input
                id="jTotal"
                type="number"
                min={0}
                value={form.totalChapters}
                onChange={(e) => set("totalChapters", e.target.value)}
                className="mt-1.5"
              />
              <FieldError message={errors.totalChapters} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="jNotes" className="text-xs">
              Notes
            </Label>
            <Textarea
              id="jNotes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Thoughts, where to pick up, recommendations…"
              rows={3}
              className="mt-1.5 resize-none"
              maxLength={5000}
            />
            <FieldError message={errors.notes} />
          </div>

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Add entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditDialog({
  entry,
  onClose,
}: {
  entry: JournalEntryDto | null;
  onClose: () => void;
}) {
  const { update } = useJournalStore();
  const [form, setForm] = useState<UpdateForm>({
    currentChapter: "0",
    totalChapters: "0",
    notes: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setForm({
        currentChapter: String(entry.currentChapter),
        totalChapters: String(entry.totalChapters),
        notes: entry.notes ?? "",
      });
      setErrors({});
      setServerError(null);
    }
  }, [entry]);

  function set(field: keyof UpdateForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    setServerError(null);

    const result = updateJournalSchema.safeParse({
      currentChapter: form.currentChapter,
      totalChapters: form.totalChapters,
      notes: form.notes,
    });

    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(flat).map(([k, v]) => [k, v?.[0]])
        )
      );
      return;
    }

    setSubmitting(true);
    try {
      await update(entry.entryId, result.data);
      onClose();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">
            {entry?.externalTitle ?? "Edit entry"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="eCurrent" className="text-xs">
                Current chapter
              </Label>
              <Input
                id="eCurrent"
                type="number"
                min={0}
                value={form.currentChapter}
                onChange={(e) => set("currentChapter", e.target.value)}
                className="mt-1.5"
              />
              <FieldError message={errors.currentChapter} />
            </div>
            <div>
              <Label htmlFor="eTotal" className="text-xs">
                Total chapters
              </Label>
              <Input
                id="eTotal"
                type="number"
                min={0}
                value={form.totalChapters}
                onChange={(e) => set("totalChapters", e.target.value)}
                className="mt-1.5"
              />
              <FieldError message={errors.totalChapters} />
            </div>
          </div>

          <div>
            <Label htmlFor="eNotes" className="text-xs">
              Notes
            </Label>
            <Textarea
              id="eNotes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              className="mt-1.5 resize-none"
              maxLength={5000}
            />
            <FieldError message={errors.notes} />
          </div>

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onEdit,
}: {
  entry: JournalEntryDto;
  onEdit: (entry: JournalEntryDto) => void;
}) {
  const { remove } = useJournalStore();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await remove(entry.entryId);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  const pct = progressPct(entry);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3 hover:shadow-sm transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
              {FORMAT_LABELS[entry.formatType as FormatType] ?? "Unknown"}
            </span>
            {entry.submittedAsSuggestion && (
              <span className="text-[10px] font-medium tracking-widest uppercase text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded">
                Submitted
              </span>
            )}
          </div>
          <a
            href={entry.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <span className="line-clamp-2">{entry.externalTitle}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {confirming ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleting}
                title="Confirm delete"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(entry)}
                title="Edit progress"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirming(true)}
                title="Delete entry"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {entry.totalChapters > 0 && (
        <div className="space-y-1">
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      {entry.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {entry.notes}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
        <span>{progressLabel(entry)}</span>
        <span>{formatDate(entry.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function JournalSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-card p-5 space-y-3 animate-pulse"
        >
          <div className="flex justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-2.5 w-12 rounded bg-muted" />
              <div className="h-4 w-48 rounded bg-muted" />
            </div>
            <div className="flex gap-1">
              <div className="h-7 w-7 rounded bg-muted" />
              <div className="h-7 w-7 rounded bg-muted" />
            </div>
          </div>
          <div className="h-1 w-full rounded-full bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const { entries, isLoading, error, fetchEntries } = useJournalStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntryDto | null>(null);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
            reading elsewhere
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            journal
          </h1>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add entry
        </Button>
      </div>

      {/* Body */}
      {isLoading ? (
        <JournalSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchEntries}>
            Retry
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <BookMarked
            className="h-10 w-10 text-muted-foreground/20"
            strokeWidth={1}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Your journal is empty
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Track manga, manhwa, or novels you're reading on other platforms.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add your first entry
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <EntryCard
              key={entry.entryId}
              entry={entry}
              onEdit={setEditEntry}
            />
          ))}
        </div>
      )}

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditDialog entry={editEntry} onClose={() => setEditEntry(null)} />
    </div>
  );
}

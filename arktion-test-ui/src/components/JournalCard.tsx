import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  FORMAT_LABELS,
  type JournalEntryDto,
} from '../lib/api';

const FORMAT_OPTIONS = [0, 1, 2, 3, 4];

export function JournalCard() {
  const qc = useQueryClient();

  // Create form
  const [title, setTitle] = useState('');
  const [formatType, setFormatType] = useState(1);
  const [externalUrl, setExternalUrl] = useState('');
  const [totalChapters, setTotalChapters] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [notes, setNotes] = useState('');
  const [createError, setCreateError] = useState('');

  // Inline edit state
  const [editing, setEditing] = useState<string | null>(null);
  const [editChapter, setEditChapter] = useState(0);
  const [editTotal, setEditTotal] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  const { data: entries, isPending, isFetching, refetch, error } = useQuery<JournalEntryDto[], Error>({
    queryKey: ['journal'],
    queryFn: getJournalEntries,
    refetchOnWindowFocus: false,
  });

  const create = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      setTitle(''); setExternalUrl(''); setNotes(''); setTotalChapters(0); setCurrentChapter(0);
      setCreateError('');
    },
    onError: (e: Error) => setCreateError(e.message),
  });

  const update = useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: Parameters<typeof updateJournalEntry>[1] }) =>
      updateJournalEntry(entryId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  });

  function startEdit(e: JournalEntryDto) {
    setEditing(e.entryId);
    setEditChapter(e.currentChapter);
    setEditTotal(e.totalChapters);
    setEditNotes(e.notes ?? '');
  }

  function handleCreate() {
    if (!title.trim()) { setCreateError('Title is required'); return; }
    if (!externalUrl.trim()) { setCreateError('URL is required'); return; }
    create.mutate({ externalTitle: title.trim(), formatType, externalUrl: externalUrl.trim(), totalChapters, currentChapter, notes: notes.trim() || undefined });
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Off-Platform Journal</h2>
        <button onClick={() => refetch()} disabled={isFetching} className="rounded bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50">
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Create form */}
      <div className="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Add Entry</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
          <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="URL (e.g. https://mangaplus.com/…)" className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
          <select value={formatType} onChange={(e) => setFormatType(Number(e.target.value))} className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100">
            {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" min={0} value={currentChapter} onChange={(e) => setCurrentChapter(Math.max(0, Number(e.target.value)))} placeholder="Current ch." className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
            <input type="number" min={0} value={totalChapters} onChange={(e) => setTotalChapters(Math.max(0, Number(e.target.value)))} placeholder="Total ch." className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="col-span-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 resize-none" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCreate} disabled={create.isPending} className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50">
            {create.isPending ? 'Adding…' : 'Add Entry'}
          </button>
          {createError && <span className="text-red-400 text-sm">{createError}</span>}
          {create.isSuccess && <span className="text-emerald-400 text-sm">Added!</span>}
        </div>
      </div>

      {/* List */}
      {isPending && <p className="text-slate-400 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      {entries && entries.length === 0 && <p className="text-slate-500 text-sm">No journal entries yet.</p>}
      {entries && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded border border-slate-700 bg-slate-900 p-4">
              {editing === e.entryId ? (
                <div className="space-y-2">
                  <p className="font-medium text-sm">{e.externalTitle}</p>
                  <div className="flex gap-2">
                    <input type="number" min={0} value={editChapter} onChange={(ev) => setEditChapter(Math.max(0, Number(ev.target.value)))} placeholder="Current ch." className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none" />
                    <input type="number" min={0} value={editTotal} onChange={(ev) => setEditTotal(Math.max(0, Number(ev.target.value)))} placeholder="Total ch." className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none" />
                  </div>
                  <textarea value={editNotes} onChange={(ev) => setEditNotes(ev.target.value)} rows={2} placeholder="Notes" className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => update.mutate({ entryId: e.entryId, body: { currentChapter: editChapter, totalChapters: editTotal, notes: editNotes || undefined } })} disabled={update.isPending} className="rounded bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50">
                      {update.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(null)} className="rounded border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm text-slate-100">
                      <a href={e.externalUrl} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-300 underline">{e.externalTitle}</a>
                    </p>
                    <p className="text-xs text-slate-500">{FORMAT_LABELS[e.formatType]} · Ch {e.currentChapter}/{e.totalChapters || '?'}</p>
                    {e.notes && <p className="text-xs text-slate-400 italic">{e.notes}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(e)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                    <button onClick={() => del.mutate(e.entryId)} disabled={del.isPending} className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyProfile,
  updateMyProfile,
  type UpdateProfileBody,
  type UserProfile,
} from '../lib/api';

export function ProfileCard() {
  const queryClient = useQueryClient();
  const { data, error, isPending } = useQuery<UserProfile, Error>({
    queryKey: ['profile'],
    queryFn: getMyProfile,
    refetchOnWindowFocus: false,
  });

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Seed the form from the loaded record once it arrives.
  useEffect(() => {
    if (data) {
      setDisplayName(data.displayName ?? '');
      setAvatarUrl(data.avatarUrl ?? '');
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (body: UpdateProfileBody) => updateMyProfile(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated);
    },
  });

  function handleSave() {
    // Omit empty fields entirely — never send empty strings to class-validator.
    const body: UpdateProfileBody = {};
    if (displayName.trim()) body.displayName = displayName.trim();
    if (avatarUrl.trim()) body.avatarUrl = avatarUrl.trim();
    save.mutate(body);
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h2 className="mb-3 text-lg font-semibold">My profile</h2>

      {isPending && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error.message}</p>}

      {data && (
        <div className="space-y-4">
          <pre className="overflow-x-auto rounded bg-slate-950 p-4 text-xs text-slate-300">
            {JSON.stringify(data, null, 2)}
          </pre>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                placeholder="display name"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">Avatar URL</span>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                placeholder="https://…"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={save.isPending}
              className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
            {save.isSuccess && <span className="text-emerald-400 text-sm">Saved</span>}
            {save.error && <span className="text-red-400 text-sm">{save.error.message}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

import { type FormEvent, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Home() {
  const { messages, isLoading, isSaving, error, saveMessage } = useMessages();
  const [draft, setDraft] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await saveMessage(draft);
    if (saved) {
      setDraft('');
    }
  };

  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Chaptering Officer Portal
      </h1>

      <Card className="mt-8 text-left">
        <h2 className="text-sm font-semibold text-slate-900">Send a message</h2>

        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <Input
            aria-label="Message"
            placeholder="Type a message…"
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
            disabled={isSaving}
          />
          <Button type="submit" disabled={isSaving || draft.trim().length === 0}>
            {isSaving ? 'Sending…' : 'Send'}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet — be the first to send one.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map((item: any) => (
                <li key={item.id} className="py-2 text-sm">
                  <p className="text-slate-900">{item.message}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

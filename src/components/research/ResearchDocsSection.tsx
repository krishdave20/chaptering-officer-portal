import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { extractDocText, SUPPORTED_DOC_EXTENSIONS } from '@/lib/extractDocText';
import { summarizeResearchText, type ResearchSummary } from '@/services/research/researchSummarizer';
import {
  deleteResearchDoc,
  fetchResearchDocs,
  saveResearchDoc,
  type StoredResearchDoc,
} from '@/services/research/researchService';
import ResearchSummaryView from './ResearchSummaryView';

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String(err.message);
  return '';
}

interface PendingDoc {
  fileName: string;
  rawText: string;
  summary: ResearchSummary;
}

type UploadStage = 'idle' | 'reading' | 'summarizing' | 'saving';

const STAGE_LABEL: Record<UploadStage, string> = {
  idle: '',
  reading: 'Reading document...',
  summarizing: 'Summarizing and sorting centers (this can take about a minute)...',
  saving: 'Saving...',
};

export default function ResearchDocsSection({ locationId }: { locationId: string }) {
  const [docs, setDocs] = useState<StoredResearchDoc[]>([]);
  const [loadError, setLoadError] = useState('');
  const [stage, setStage] = useState<UploadStage>('idle');
  const [uploadError, setUploadError] = useState('');
  const [pending, setPending] = useState<PendingDoc | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyDocs = (data: StoredResearchDoc[]) => {
    setDocs(data);
    setLoadError('');
    setExpandedId((current) => current ?? data[0]?.id ?? null);
  };

  const handleLoadError = (err: unknown) => {
    console.error('Error loading research docs:', errorMessage(err));
    setLoadError('Could not load research docs.');
  };

  useEffect(() => {
    let cancelled = false;
    fetchResearchDocs(locationId)
      .then((data) => {
        if (!cancelled) applyDocs(data);
      })
      .catch((err) => {
        if (!cancelled) handleLoadError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const reloadDocs = async () => {
    try {
      applyDocs(await fetchResearchDocs(locationId));
    } catch (err) {
      handleLoadError(err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setPending(null);

    try {
      setStage('reading');
      const rawText = await extractDocText(file);
      if (!rawText) {
        throw new Error('The uploaded document is empty.');
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is missing from environment variables.');
      }

      setStage('summarizing');
      const summary = await summarizeResearchText(rawText, apiKey);
      setPending({ fileName: file.name, rawText, summary });
    } catch (err) {
      setUploadError(errorMessage(err) || 'An unexpected error occurred during upload.');
      console.error(err);
    } finally {
      setStage('idle');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!pending) return;
    setStage('saving');
    setUploadError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await saveResearchDoc({
        locationId,
        officerId: user?.id ?? null,
        fileName: pending.fileName,
        rawText: pending.rawText,
        summary: pending.summary,
      });
      setPending(null);
      setExpandedId(null);
      await reloadDocs();
    } catch (err) {
      setUploadError('Failed to save the research doc: ' + (errorMessage(err) || 'unknown error'));
      console.error(err);
    } finally {
      setStage('idle');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this research doc and its centers?')) return;

    try {
      await deleteResearchDoc(docId);
      setDocs(docs.filter((d) => d.id !== docId));
    } catch (err) {
      alert('Error deleting research doc: ' + errorMessage(err));
    }
  };

  const busy = stage !== 'idle';

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e4e4e7', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111' }}>Research Docs</h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.813rem', color: '#64748b' }}>
            Upload a center research doc to get a short summary and a sorted list of every center.
          </p>
        </div>
        <div>
          <input
            type="file"
            accept={SUPPORTED_DOC_EXTENSIONS.join(',')}
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            style={{ padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, opacity: busy ? 0.7 : 1 }}
          >
            + Upload Research Doc (.docx)
          </button>
        </div>
      </div>

      {busy && (
        <p style={{ fontSize: '0.875rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '0.625rem 0.75rem', margin: '0 0 1rem 0' }}>
          {STAGE_LABEL[stage]}
        </p>
      )}
      {uploadError && <p style={{ color: 'red', fontSize: '0.875rem', marginBottom: '1rem' }}>{uploadError}</p>}

      {pending && (
        <div style={{ border: '2px solid #0066cc', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: '#f8fbff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Review before saving</span>
              <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#0f172a' }}>{pending.summary.title}</h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{pending.fileName}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleSave}
                disabled={busy}
                style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Save to Chapter
              </button>
              <button
                onClick={() => setPending(null)}
                disabled={busy}
                style={{ padding: '0.5rem 1rem', background: '#f1f1f3', color: '#333', border: '1px solid #d4d4d8', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
              >
                Discard
              </button>
            </div>
          </div>
          <ResearchSummaryView
            overview={pending.summary.overview}
            keyTakeaways={pending.summary.key_takeaways}
            nextSteps={pending.summary.next_steps}
            members={pending.summary.members}
            centers={pending.summary.centers}
          />
        </div>
      )}

      {loadError && <p style={{ color: 'red', fontSize: '0.875rem', marginBottom: '1rem' }}>{loadError}</p>}

      {docs.length === 0 && !pending ? (
        <p style={{ fontSize: '0.875rem', color: '#777', fontStyle: 'italic', margin: 0 }}>No research docs uploaded for this chapter yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {docs.map((doc) => {
            const expanded = expandedId === doc.id;
            return (
              <div key={doc.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : doc.id)}
                    style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', flex: 1 }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>
                      {expanded ? '▾' : '▸'} {doc.title || 'Untitled Research Doc'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(doc.created_at).toLocaleDateString()} · {doc.file_name} · {doc.research_centers.length} centers
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    style={{ padding: '0.25rem 0.5rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Delete
                  </button>
                </div>
                {expanded && (
                  <div style={{ marginTop: '1rem' }}>
                    <ResearchSummaryView
                      overview={doc.overview}
                      keyTakeaways={doc.key_takeaways}
                      nextSteps={doc.next_steps}
                      members={doc.members}
                      centers={doc.research_centers}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

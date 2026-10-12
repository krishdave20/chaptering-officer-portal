import { useState } from 'react';
import {
  CENTER_STATUSES,
  type CenterStatus,
  type ResearchCenter,
  type ResearchNextStep,
} from '@/services/research/researchSummarizer';

const STATUS_META: Record<CenterStatus, { label: string; color: string; background: string; border: string }> = {
  lesson_scheduled: { label: 'Lesson scheduled', color: '#065f46', background: '#d1fae5', border: '#a7f3d0' },
  meeting_scheduled: { label: 'Meeting scheduled', color: '#1e40af', background: '#dbeafe', border: '#bfdbfe' },
  in_talks: { label: 'In talks', color: '#6b21a8', background: '#f3e8ff', border: '#e9d5ff' },
  awaiting_response: { label: 'Awaiting response', color: '#92400e', background: '#fef3c7', border: '#fde68a' },
  not_contacted: { label: 'Not contacted', color: '#374151', background: '#f3f4f6', border: '#e5e7eb' },
  not_interested: { label: 'Not interested', color: '#991b1b', background: '#fee2e2', border: '#fecaca' },
};

interface ResearchSummaryViewProps {
  overview: string;
  keyTakeaways: string[];
  nextSteps: ResearchNextStep[];
  members: string[];
  centers: ResearchCenter[];
}

function StatusPill({ status }: { status: CenterStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.not_contacted;
  return (
    <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', color: meta.color, background: meta.background, border: `1px solid ${meta.border}` }}>
      {meta.label}
    </span>
  );
}

export default function ResearchSummaryView({ overview, keyTakeaways, nextSteps, members, centers }: ResearchSummaryViewProps) {
  const [statusFilter, setStatusFilter] = useState<CenterStatus | 'all'>('all');

  const counts = CENTER_STATUSES.map((status) => ({
    status,
    count: centers.filter((c) => c.status === status).length,
  })).filter((s) => s.count > 0);

  const visibleCenters = centers
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .sort((a, b) => CENTER_STATUSES.indexOf(a.status) - CENTER_STATUSES.indexOf(b.status));

  const sectionHeading = { margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#0f172a', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.55 }}>{overview}</p>

      {members.length > 0 && (
        <p style={{ margin: 0, fontSize: '0.813rem', color: '#64748b' }}>
          <strong>Members:</strong> {members.join(', ')}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {keyTakeaways.length > 0 && (
          <div>
            <h4 style={sectionHeading}>Key takeaways</h4>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', listStyle: 'disc', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
              {keyTakeaways.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
        {nextSteps.length > 0 && (
          <div>
            <h4 style={sectionHeading}>Next steps</h4>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', listStyle: 'disc', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
              {nextSteps.map((step, i) => (
                <li key={i}>
                  {step.owner && <strong>{step.owner}: </strong>}
                  {step.task}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h4 style={sectionHeading}>Centers ({centers.length})</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{ padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, border: '1px solid #cbd5e1', background: statusFilter === 'all' ? '#0f172a' : '#fff', color: statusFilter === 'all' ? '#fff' : '#334155' }}
          >
            All {centers.length}
          </button>
          {counts.map(({ status, count }) => {
            const meta = STATUS_META[status];
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(active ? 'all' : status)}
                style={{ padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, border: `1px solid ${active ? meta.color : meta.border}`, background: meta.background, color: meta.color }}
              >
                {meta.label} {count}
              </button>
            );
          })}
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.813rem', minWidth: '720px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Center</th>
                <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Latest update</th>
              </tr>
            </thead>
            <tbody>
              {visibleCenters.map((center, i) => (
                <tr key={`${center.name}-${i}`} style={{ borderTop: '1px solid #e2e8f0', verticalAlign: 'top', background: '#fff' }}>
                  <td style={{ padding: '0.625rem 0.75rem', minWidth: '170px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{center.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                      {center.center_type}
                      {center.assigned_to && ` · ${center.assigned_to}`}
                    </div>
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem' }}>
                    <StatusPill status={center.status} />
                    {center.last_contacted && (
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>Last: {center.last_contacted}</div>
                    )}
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem', minWidth: '170px', color: '#334155' }}>
                    {center.contact_name && (
                      <div>
                        {center.contact_name}
                        {center.contact_role && <span style={{ color: '#64748b' }}> · {center.contact_role}</span>}
                      </div>
                    )}
                    {center.phone && <div style={{ color: '#64748b' }}>{center.phone}</div>}
                    {center.email && (
                      <a href={`mailto:${center.email}`} style={{ color: '#0066cc', wordBreak: 'break-all' }}>{center.email}</a>
                    )}
                    {!center.contact_name && !center.phone && !center.email && <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem', color: '#334155', lineHeight: 1.45 }}>
                    <div>{center.latest_update}</div>
                    {center.next_step && (
                      <div style={{ marginTop: '0.25rem', color: '#0369a1' }}>
                        <strong>Next:</strong> {center.next_step}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

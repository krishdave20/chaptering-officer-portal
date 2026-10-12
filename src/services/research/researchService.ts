import { supabase } from '@/lib/supabase';
import type { ResearchCenter, ResearchNextStep, ResearchSummary } from './researchSummarizer';

export interface StoredResearchCenter extends ResearchCenter {
  id: string;
}

export interface StoredResearchDoc {
  id: string;
  file_name: string;
  title: string;
  overview: string;
  key_takeaways: string[];
  next_steps: ResearchNextStep[];
  members: string[];
  created_at: string;
  research_centers: StoredResearchCenter[];
}

const DOC_COLUMNS = `
  id, file_name, title, overview, key_takeaways, next_steps, members, created_at,
  research_centers (
    id, name, center_type, assigned_to, contact_name, contact_role, phone, email,
    status, last_contacted, latest_update, next_step
  )
`;

export async function fetchResearchDocs(locationId: string): Promise<StoredResearchDoc[]> {
  const { data, error } = await supabase
    .from('research_docs')
    .select(DOC_COLUMNS)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as StoredResearchDoc[];
}

export async function saveResearchDoc(params: {
  locationId: string;
  officerId: string | null;
  fileName: string;
  rawText: string;
  summary: ResearchSummary;
}): Promise<void> {
  const { locationId, officerId, fileName, rawText, summary } = params;

  const { data: doc, error: docError } = await supabase
    .from('research_docs')
    .insert([
      {
        location_id: locationId,
        officer_id: officerId,
        file_name: fileName,
        title: summary.title,
        overview: summary.overview,
        key_takeaways: summary.key_takeaways,
        next_steps: summary.next_steps,
        members: summary.members,
        raw_text: rawText,
      },
    ])
    .select('id')
    .single();

  if (docError) throw docError;

  if (summary.centers.length > 0) {
    const { error: centersError } = await supabase.from('research_centers').insert(
      summary.centers.map((center) => ({
        ...center,
        research_doc_id: doc.id,
        location_id: locationId,
      })),
    );

    if (centersError) {
      await supabase.from('research_docs').delete().eq('id', doc.id);
      throw centersError;
    }
  }
}

export async function deleteResearchDoc(id: string): Promise<void> {
  const { error } = await supabase.from('research_docs').delete().eq('id', id);
  if (error) throw error;
}

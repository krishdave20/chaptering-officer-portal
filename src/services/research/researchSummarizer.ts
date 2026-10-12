export const CENTER_STATUSES = [
  'lesson_scheduled',
  'meeting_scheduled',
  'in_talks',
  'awaiting_response',
  'not_contacted',
  'not_interested',
] as const;

export type CenterStatus = (typeof CENTER_STATUSES)[number];

export const CENTER_TYPES = ['school', 'library', 'daycare', 'ymca', 'district', 'other'] as const;

export type CenterType = (typeof CENTER_TYPES)[number];

export interface ResearchCenter {
  name: string;
  center_type: CenterType;
  assigned_to: string;
  contact_name: string;
  contact_role: string;
  phone: string;
  email: string;
  status: CenterStatus;
  last_contacted: string;
  latest_update: string;
  next_step: string;
}

export interface ResearchNextStep {
  owner: string;
  task: string;
}

export interface ResearchSummary {
  title: string;
  overview: string;
  key_takeaways: string[];
  next_steps: ResearchNextStep[];
  members: string[];
  centers: ResearchCenter[];
}

const MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'];
const RETRYABLE = new Set([429, 500, 503]);

const SYSTEM_PROMPT = `You summarize STEMsters chapter research docs. A research doc is a working log where chapter members track outreach to local centers (schools, libraries, daycares, YMCAs, districts) they want to teach STEM lessons at. It usually contains a status key, check-in expectations, a calling schedule, per-member blocks of centers with contact details and dated call/email logs, and action steps from advisors.

Turn it into a concise, structured record.

Rules:
- One entry per center. The same center often appears several times (early notes and later updates); merge them into one entry using the most recent information.
- status must reflect where things stand now:
  lesson_scheduled = a lesson or trial lesson is booked or confirmed
  meeting_scheduled = a meeting/call with a decision-maker is booked
  in_talks = the center replied and is engaging, but nothing is booked
  awaiting_response = reached out (calls, voicemails, emails) and waiting on them
  not_contacted = listed but no real outreach yet
  not_interested = declined, said they can't sponsor, or told us to stop contacting
- assigned_to is the member(s) responsible, usually the name after the dash in the center heading.
- contact_name/contact_role: the best decision-maker contact (director, principal, coordinator, owner). Use "" if unknown. Never write "N/A", "Didn't specify" or similar; use "".
- phone/email: the best direct contact; "" if none.
- last_contacted: the most recent outreach date as written in the doc (e.g. "6/8"), or "".
- latest_update: one short sentence on the current state. No call-by-call history.
- next_step: one short imperative sentence, or "" if nothing is pending.
- overview: 2-3 sentences on where the chapter's outreach stands overall.
- key_takeaways: at most 5 short bullets a chaptering officer should know (wins, blockers, patterns).
- next_steps: the open action items still relevant, at most 6, with owner ("" if unassigned). Skip items that are clearly done.
- members: names of chapter members doing outreach.
- Be concise and factual. Do not invent anything not in the doc.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Short title, e.g. "Round Rock center outreach"' },
    overview: { type: 'STRING' },
    key_takeaways: { type: 'ARRAY', items: { type: 'STRING' } },
    next_steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { owner: { type: 'STRING' }, task: { type: 'STRING' } },
        required: ['owner', 'task'],
      },
    },
    members: { type: 'ARRAY', items: { type: 'STRING' } },
    centers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          center_type: { type: 'STRING', enum: [...CENTER_TYPES] },
          assigned_to: { type: 'STRING' },
          contact_name: { type: 'STRING' },
          contact_role: { type: 'STRING' },
          phone: { type: 'STRING' },
          email: { type: 'STRING' },
          status: { type: 'STRING', enum: [...CENTER_STATUSES] },
          last_contacted: { type: 'STRING' },
          latest_update: { type: 'STRING' },
          next_step: { type: 'STRING' },
        },
        required: [
          'name',
          'center_type',
          'assigned_to',
          'contact_name',
          'contact_role',
          'phone',
          'email',
          'status',
          'last_contacted',
          'latest_update',
          'next_step',
        ],
      },
    },
  },
  required: ['title', 'overview', 'key_takeaways', 'next_steps', 'members', 'centers'],
};

async function callGemini(model: string, text: string, apiKey: string): Promise<Response> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });
}

export async function summarizeResearchText(text: string, apiKey: string): Promise<ResearchSummary> {
  let response: Response | null = null;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await callGemini(model, text, apiKey);
      if (!RETRYABLE.has(response.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
    if (response && !RETRYABLE.has(response.status)) break;
  }

  if (!response || !response.ok) {
    console.error('Gemini API Error Details:', await response?.text());
    if (response && RETRYABLE.has(response.status)) {
      throw new Error('The AI service is busy right now. Please try again in a minute.');
    }
    throw new Error(`Gemini API Error (${response?.status}). Check the console for details.`);
  }

  const data = await response.json();
  const generated = data.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
  if (!generated) {
    throw new Error('Gemini returned an empty response.');
  }

  return JSON.parse(generated) as ResearchSummary;
}

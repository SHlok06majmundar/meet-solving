const { randomUUID } = require('node:crypto');
const { supabaseAdmin } = require('../config/clients');

const meetingTranscripts = new Map();
const meetingInsights = new Map();
const meetingChats = new Map();

function normalizeTranscriptRow(row) {
  return {
    id: row.transcript_id,
    meetingId: row.meeting_id,
    speakerId: row.user_id,
    speakerName: row.speaker_name,
    text: row.transcript_text,
    source: row.source,
    isFinal: Boolean(row.is_final),
    timestamp: row.updated_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function upsertInMemoryTranscript(entry) {
  if (!meetingTranscripts.has(entry.meeting_id)) {
    meetingTranscripts.set(entry.meeting_id, []);
  }

  const transcripts = meetingTranscripts.get(entry.meeting_id);
  const existingIndex = transcripts.findIndex(item => item.transcript_id === entry.transcript_id && item.user_id === entry.user_id);

  if (existingIndex >= 0) {
    transcripts[existingIndex] = {
      ...transcripts[existingIndex],
      ...entry,
      updated_at: entry.updated_at || new Date().toISOString(),
    };
  } else {
    transcripts.push(entry);
  }

  if (transcripts.length > 2000) {
    transcripts.splice(0, transcripts.length - 2000);
  }
}

async function saveTranscript({
  meetingId,
  transcriptId,
  userId,
  speakerName,
  text,
  source = 'browser-stt',
  createdAt,
  isFinal = false,
}) {
  if (!meetingId || !text) {
    return { saved: false, reason: 'missing-required-fields' };
  }

  const nowIso = new Date().toISOString();
  const entry = {
    transcript_id: transcriptId || `${userId}-${randomUUID()}`,
    meeting_id: meetingId,
    user_id: userId || null,
    speaker_name: speakerName || 'Unknown',
    transcript_text: text,
    source,
    is_final: Boolean(isFinal),
    created_at: createdAt || nowIso,
    updated_at: nowIso,
  };

  if (supabaseAdmin) {
    // Atomically create/update only this meeting and this verified author's chunk.
    // The composite primary key prevents a supplied ID from overwriting another author.
    const { error } = await supabaseAdmin.from('meeting_transcripts').upsert(entry, {
      onConflict: 'meeting_id,user_id,transcript_id',
    });
    if (error) throw error;
    return { saved: true, source: 'supabase' };
  }
  upsertInMemoryTranscript(entry);
  return { saved: true, source: 'memory' };
}

function encodeCursor(row) {
  return Buffer.from(JSON.stringify([row.updated_at, row.user_id, row.transcript_id])).toString('base64url');
}
function decodeCursor(value) {
  if (!value) return null;
  try {
    if (typeof value !== 'string' || value.length > 2048) throw new Error();
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString());
    if (!Array.isArray(cursor) || cursor.length !== 3 || cursor.some(item => typeof item !== 'string') || !Number.isFinite(Date.parse(cursor[0]))) throw new Error();
    return cursor;
  } catch { throw Object.assign(new Error('Invalid transcript cursor'), { status: 400 }); }
}
async function getMeetingTranscripts(meetingId, options = {}) {
  if (!meetingId) return { success: false, error: 'meetingId is required' };
  const cursor = decodeCursor(options.since);
  const limit = Math.min(Math.max(Number(options.limit) || 200, 1), 2000);
  let rows;
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.rpc('read_meeting_transcripts', {
      p_meeting_id: meetingId, p_since: cursor?.[0] || null,
      p_after_user: cursor?.[1] || '', p_after_id: cursor?.[2] || '', p_limit: limit,
    });
    if (error) throw error;
    rows = data || [];
  } else {
    const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
    const compareCursor = (a, b) => compare(a[0], b[0]) || compare(a[1], b[1]) || compare(a[2], b[2]);
    const tuple = row => [row.updated_at, row.user_id, row.transcript_id];
    rows = (meetingTranscripts.get(meetingId) || [])
      .filter(row => !cursor || compareCursor(tuple(row), cursor) > 0)
      .sort((a, b) => compareCursor(tuple(a), tuple(b))).slice(0, limit);
  }
  return {
    success: true, transcripts: rows.map(normalizeTranscriptRow),
    latestCursor: rows.length ? encodeCursor(rows[rows.length - 1]) : options.since || null,
    hasMore: rows.length === limit, source: supabaseAdmin ? 'supabase' : 'memory',
  };
}

async function getMeetingTranscriptContext(meetingId, fallbackTranscripts = []) {
  if (!meetingId && (!fallbackTranscripts || fallbackTranscripts.length === 0)) {
    return '';
  }

  if (fallbackTranscripts && fallbackTranscripts.length > 0) {
    return fallbackTranscripts
      .filter(item => item && item.text)
      .map(item => `${item.speakerName || 'Speaker'}: ${item.text}`)
      .join('\n');
  }

  if (meetingId) {
    const liveRows = await getMeetingTranscripts(meetingId, { limit: 2000 });
    if (liveRows.success && liveRows.transcripts.length > 0) {
      return liveRows.transcripts
        .map(row => `${row.speakerName || 'Speaker'}: ${row.text}`)
        .join('\n');
    }
  }

  if (!meetingId || !meetingTranscripts.has(meetingId)) {
    return '';
  }

  return meetingTranscripts
    .get(meetingId)
    .map(row => `${row.speaker_name || 'Speaker'}: ${row.transcript_text}`)
    .join('\n');
}

async function saveInsight(meetingId, payload) {
  if (!meetingId || !payload) return;

  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('meeting_insights').upsert({ meeting_id: meetingId, payload, created_at: new Date().toISOString() });
    if (error) throw error;
    return;
  }
  meetingInsights.set(meetingId, {
    meeting_id: meetingId,
    payload,
    created_at: new Date().toISOString(),
  });
}

async function saveChat(meetingId, question, answer) {
  if (!meetingId) return;

  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('meeting_chats').insert({ meeting_id: meetingId, question, answer });
    if (error) throw error;
    return;
  }
  if (!meetingChats.has(meetingId)) {
    meetingChats.set(meetingId, []);
  }

  if (meetingChats.get(meetingId).length >= 200) meetingChats.get(meetingId).shift();
  meetingChats.get(meetingId).push({
    meeting_id: meetingId,
    question,
    answer,
    created_at: new Date().toISOString(),
  });
}

async function getLatestMeetingInsight(meetingId) {
  if (!meetingId) {
    return { error: 'meetingId is required', status: 400 };
  }

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('meeting_insights').select('meeting_id,payload,created_at').eq('meeting_id', meetingId).maybeSingle();
    if (error) throw error;
    return data ? { data, status: 200 } : { error: 'No insights found for this meeting', status: 404 };
  }
  const insight = meetingInsights.get(meetingId);
  if (!insight) {
    return { error: 'No insights found for this meeting', status: 404 };
  }

  return { data: insight, status: 200 };
}

module.exports = {
  encodeCursor, decodeCursor,
  saveTranscript,
  getMeetingTranscripts,
  getMeetingTranscriptContext,
  saveInsight,
  saveChat,
  getLatestMeetingInsight,
};

// Bounded development cache; production reads/writes are exclusively durable.
const cacheCleanup = setInterval(() => {
  for (const cache of [meetingTranscripts, meetingInsights, meetingChats]) {
    while (cache.size > 1000) cache.delete(cache.keys().next().value);
  }
}, 60000);
cacheCleanup.unref();

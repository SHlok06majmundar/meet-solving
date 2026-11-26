const { randomUUID } = require('node:crypto');
const { supabaseAdmin } = require('../config/clients');
const { NODE_ENV } = require('../config/env');

// Local development only. Production always uses durable database membership.
const localMeetings = new Map();
const MEETING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function validateMeetingId(id) {
  if (typeof id !== 'string' || !MEETING_ID.test(id)) fail(400, 'Invalid meeting ID. Use a current invitation link.');
}
function assertDatabase() {
  if (!supabaseAdmin && NODE_ENV === 'production') fail(503, 'Database is unavailable');
}
function localMeeting(id) {
  const meeting = localMeetings.get(id);
  if (meeting && meeting.expiresAt < Date.now()) { localMeetings.delete(id); return null; }
  return meeting;
}
async function createMeeting(userId) {
  assertDatabase();
  const id = randomUUID();
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('meetings').insert({ id, owner_id: userId });
    if (error) throw error;
    await joinMeeting(id, userId);
  } else {
    for (const [key, meeting] of localMeetings) if (meeting.expiresAt < Date.now()) localMeetings.delete(key);
    if (localMeetings.size >= 1000) fail(503, 'Local meeting capacity reached');
    localMeetings.set(id, { members: new Set([userId]), expiresAt: Date.now() + 86400000 });
  }
  return id;
}
// Possession of the full, random invitation ID permits an authenticated user to join.
async function joinMeeting(id, userId) {
  validateMeetingId(id);
  assertDatabase();
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('meetings').select('id').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) fail(404, 'Meeting not found. Check your invitation link.');
    const result = await supabaseAdmin.from('meeting_members').upsert({ meeting_id: id, user_id: userId }, { onConflict: 'meeting_id,user_id', ignoreDuplicates: true });
    if (result.error) throw result.error;
  } else {
    const meeting = localMeeting(id);
    if (!meeting) fail(404, 'Meeting not found. Check your invitation link.');
    meeting.members.add(userId);
  }
}
async function assertMeetingAccess(id, userId) {
  validateMeetingId(id);
  assertDatabase();
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('meeting_members').select('user_id').eq('meeting_id', id).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!data) fail(403, 'Join the meeting before accessing its data.');
  } else if (!localMeeting(id)?.members.has(userId)) fail(403, 'Join the meeting before accessing its data.');
}
async function requireMeetingAccess(req, res, next) {
  try {
    await assertMeetingAccess(req.params.meetingId || req.body?.meetingId, req.auth.userId);
    next();
  } catch (error) { next(error); }
}
module.exports = { createMeeting, joinMeeting, assertMeetingAccess, requireMeetingAccess, validateMeetingId };

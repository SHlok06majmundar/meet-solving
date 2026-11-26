const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const schema = readFileSync(join(__dirname, '../../supabase-schema.sql'), 'utf8');

test('schema upgrades legacy data, is repeatable, denies browser roles, and persists intelligence', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(`CREATE TABLE meeting_transcripts (
    transcript_id TEXT PRIMARY KEY, meeting_id TEXT NOT NULL, user_id TEXT,
    speaker_name TEXT, transcript_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
  ); INSERT INTO meeting_transcripts (transcript_id, meeting_id, transcript_text) VALUES ('legacy', 'old-meeting', 'Keep this transcript');`);
  await db.exec(schema);
  await db.exec(schema);
  const legacy = await db.query("SELECT transcript_text FROM meeting_transcripts WHERE transcript_id = 'legacy'");
  assert.equal(legacy.rows[0].transcript_text, 'Keep this transcript');
  const permissions = await db.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'");
  assert.ok(permissions.rows.every(row => row.rowsecurity));
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query('SELECT * FROM profiles'), /permission denied/);
    await assert.rejects(db.query('SELECT * FROM meeting_transcripts'), /permission denied/);
    await db.exec('RESET ROLE');
  }
  await db.exec(`INSERT INTO meetings (id, owner_id) VALUES ('room-a', 'alice'), ('room-b', 'bob');
    INSERT INTO meeting_insights (meeting_id, payload) VALUES ('room-a', '{"summaryBullets":["Saved"]}');
    INSERT INTO meeting_chats (meeting_id, question, answer) VALUES ('room-a', 'Who?', 'Alice');
    INSERT INTO meeting_transcripts (transcript_id, meeting_id, user_id, transcript_text, updated_at) VALUES
      ('one', 'room-a', 'alice', 'First', '2026-11-25T00:00:00Z'),
      ('two', 'room-a', 'alice', 'Second', '2026-11-25T00:00:00Z'),
      ('one', 'room-b', 'bob', 'Separate room', '2026-11-25T00:00:00Z');`);
  const page1 = await db.query("SELECT * FROM read_meeting_transcripts('room-a', NULL, '', '', 1)");
  const page2 = await db.query("SELECT * FROM read_meeting_transcripts('room-a', '2026-11-25T00:00:00Z', 'alice', 'one', 1)");
  assert.equal(page1.rows[0].transcript_id, 'one');
  assert.equal(page2.rows[0].transcript_id, 'two');
  const { rows } = await db.query("SELECT payload FROM meeting_insights WHERE meeting_id = 'room-a'");
  assert.deepEqual(rows[0].payload.summaryBullets, ['Saved']);
  assert.equal((await db.query('SELECT * FROM meeting_chats')).rows.length, 1);
});

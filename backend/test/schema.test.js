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

test('schema preserves repeated identity-key transcripts and supports legacy insights upserts', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE meeting_transcripts (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      meeting_id TEXT NOT NULL, user_id TEXT, transcript_id TEXT,
      transcript_text TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO meeting_transcripts (meeting_id, user_id, transcript_id, transcript_text) VALUES
      ('old-room', 'old-user', 'same-id', 'First version'),
      ('old-room', 'old-user', 'same-id', 'Second version'),
      ('old-room', NULL, NULL, 'Missing old identity');
    CREATE TABLE meeting_insights (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      meeting_id TEXT NOT NULL, payload JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE meeting_chat (id BIGINT PRIMARY KEY, question TEXT);
    INSERT INTO meeting_chat VALUES (1, 'Retain history');
    GRANT ALL ON meeting_chat TO anon, authenticated;`);
  await db.exec(schema);
  const firstPass = (await db.query('SELECT id, transcript_id, transcript_text FROM meeting_transcripts ORDER BY id')).rows;
  assert.equal(firstPass.length, 3);
  assert.equal(new Set(firstPass.map(row => row.transcript_id)).size, 3);
  assert.deepEqual(firstPass.map(row => row.transcript_text), ['First version', 'Second version', 'Missing old identity']);
  await db.exec(schema);
  assert.deepEqual((await db.query('SELECT id, transcript_id, transcript_text FROM meeting_transcripts ORDER BY id')).rows, firstPass);
  await db.exec(`SET ROLE service_role;
    INSERT INTO meeting_insights (meeting_id, payload) VALUES ('room', '{"version":1}')
      ON CONFLICT (meeting_id) DO UPDATE SET payload = EXCLUDED.payload;
    INSERT INTO meeting_insights (meeting_id, payload) VALUES ('room', '{"version":2}')
      ON CONFLICT (meeting_id) DO UPDATE SET payload = EXCLUDED.payload;
    INSERT INTO meeting_transcripts (meeting_id, user_id, transcript_id, transcript_text)
      VALUES ('room', 'user', 'new-chunk', 'New transcript');
    RESET ROLE;`);
  assert.equal((await db.query('SELECT payload FROM meeting_insights')).rows[0].payload.version, 2);
  assert.equal((await db.query('SELECT question FROM meeting_chat')).rows[0].question, 'Retain history');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query('SELECT * FROM meeting_chat'), /permission denied/);
    await db.exec('RESET ROLE');
  }
});

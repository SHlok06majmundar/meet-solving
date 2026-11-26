import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseMeetingInvitation,
  calendarInvitation,
} from "../src/utils/meetings.js";
const id = "c80efc1a-4ac1-4f1c-8c90-4f8df64210fd";
test("meeting invitations accept full IDs and real invitation URLs", () => {
  assert.equal(parseMeetingInvitation(`  ${id}  `), id);
  assert.equal(parseMeetingInvitation(`https://nexus.example/meet/${id}`), id);
  assert.throws(() => parseMeetingInvitation("old-id"));
  assert.throws(() => parseMeetingInvitation(`javascript:alert(1)`));
});
test("calendar invitations validate schedules and escape structured content", () => {
  const date = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
  const content = calendarInvitation({
    id,
    title: "Planning; team, release",
    date,
    time: "10:30",
    duration: 30,
    link: `https://nexus.example/meet/${id}`,
  });
  assert.ok(content.includes("SUMMARY:Planning\\; team\\, release"));
  assert.ok(content.includes("DTSTART:"));
  assert.ok(content.includes("DTEND:"));
  assert.throws(() =>
    calendarInvitation({
      id,
      title: "Old",
      date: "2020-01-01",
      time: "10:30",
      duration: 30,
      link: "",
    }),
  );
});

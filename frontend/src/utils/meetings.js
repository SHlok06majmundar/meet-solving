const meetingIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseMeetingInvitation(value) {
  const input = value.trim();
  if (meetingIdPattern.test(input)) return input.toLowerCase();
  try {
    const url = new URL(input);
    const match = url.pathname.match(/^\/(?:meet|meeting|join)\/([^/]+)\/?$/);
    if (
      ["https:", "http:"].includes(url.protocol) &&
      match &&
      meetingIdPattern.test(match[1])
    )
      return match[1].toLowerCase();
  } catch {
    /* A bare meeting ID is also accepted. */
  }
  throw new Error("Enter a valid meeting link or the full meeting ID.");
}

export function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
export function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing can disable storage. */
  }
}

export function calendarInvitation({ id, title, date, time, duration, link }) {
  const start = new Date(`${date}T${time}`);
  const minutes = Number(duration);
  if (
    !title.trim() ||
    !Number.isFinite(start.getTime()) ||
    start <= new Date() ||
    !Number.isFinite(minutes) ||
    minutes < 5 ||
    minutes > 480
  )
    throw new Error(
      "Choose a future date and a duration between 5 and 480 minutes.",
    );
  const stamp = (value) =>
    value
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escape = (value) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexus Meet//Meetings//EN",
    "BEGIN:VEVENT",
    `UID:${id}@nexus-meet`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + minutes * 60000))}`,
    `SUMMARY:${escape(title.trim())}`,
    `DESCRIPTION:${escape(`Join your Nexus meeting: ${link}`)}`,
    `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

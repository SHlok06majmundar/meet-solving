import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddRounded,
  CalendarMonthRounded,
  ContentCopyRounded,
  HistoryRounded,
  LogoutRounded,
  MicRounded,
  MicOffRounded,
  VideocamRounded,
  VideocamOffRounded,
  AutoAwesomeRounded,
  LinkRounded,
  VideoCallRounded,
  DownloadRounded,
} from "@mui/icons-material";
import ThemeToggle from "./components/ThemeToggle";
import ShareDialog from "./components/ShareDialog";
import { readResponse, useApi } from "./services/api";
import {
  calendarInvitation,
  parseMeetingInvitation,
  readStored,
  writeStored,
} from "./utils/meetings";
import "./workspace.css";

export default function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const api = useApi();
  const historyKey = `nexus_recentMeetings_${user.id}`;
  const [displayName, setDisplayName] = useState(() =>
    readStored("nexus_display_name", user.fullName || user.username || ""),
  );
  const [micOn, setMicOn] = useState(() =>
    readStored("nexus_micPreference", true),
  );
  const [videoOn, setVideoOn] = useState(() =>
    readStored("nexus_videoPreference", true),
  );
  const [recent, setRecent] = useState(() => {
    const rows = readStored(historyKey, []);
    return Array.isArray(rows)
      ? rows
          .filter(
            (row) =>
              typeof row?.id === "string" && typeof row?.title === "string",
          )
          .slice(0, 5)
      : [];
  });
  const [invitation, setInvitation] = useState("");
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [notice, setNotice] = useState(null);
  const [share, setShare] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedule, setSchedule] = useState({
    title: "",
    date: "",
    time: "",
    duration: 30,
  });
  const [calendar, setCalendar] = useState("");
  const [brief, setBrief] = useState({ title: "", goal: "", context: "" });
  const [result, setResult] = useState(null);
  const [briefOpen, setBriefOpen] = useState(false);

  useEffect(() => {
    writeStored("nexus_display_name", displayName);
    writeStored("nexus_micPreference", micOn);
    writeStored("nexus_videoPreference", videoOn);
  }, [displayName, micOn, videoOn]);

  const notify = (message, severity = "error") =>
    setNotice({ message, severity });
  const remember = (id, title, owned = false) => {
    const rows = [
      { id, title, owned, date: new Date().toISOString() },
      ...recent.filter((row) => row.id !== id),
    ].slice(0, 5);
    setRecent(rows);
    writeStored(historyKey, rows);
  };
  const run = async (action, task) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(action);
    try {
      await task();
    } catch (error) {
      notify(error.message || "Something went wrong. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  };
  const enter = async (id, title, owned) => {
    await readResponse(
      await api(`/api/meetings/${id}/join`, { method: "POST" }),
    );
    sessionStorage.setItem(
      "nexus_meeting_info",
      JSON.stringify({
        meetingId: id,
        username: displayName.trim() || user.firstName || "Participant",
        micEnabled: micOn,
        videoEnabled: videoOn,
      }),
    );
    remember(id, title, owned);
    navigate(`/meet/${id}`);
  };
  const create = () =>
    run("create", async () => {
      const { meetingId } = await readResponse(
        await api("/api/generate-meeting-id"),
      );
      await enter(meetingId, "Instant meeting", true);
    });
  const join = (value = invitation, title = "Joined meeting") =>
    run("join", async () => enter(parseMeetingInvitation(value), title, false));
  const copy = async (id) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/meet/${id}`,
      );
      notify("Meeting link copied.", "success");
    } catch {
      notify("Unable to copy. Open Share to select the meeting link.");
    }
  };
  const prepareSchedule = () =>
    run("schedule", async () => {
      // Validate before creating a room, then offer a real calendar file.
      const details = {
        ...schedule,
        id: "preview",
        link: window.location.origin,
      };
      calendarInvitation(details);
      const { meetingId } = await readResponse(
        await api("/api/generate-meeting-id"),
      );
      const content = calendarInvitation({
        ...details,
        id: meetingId,
        link: `${window.location.origin}/meet/${meetingId}`,
      });
      setCalendar(content);
      setShare({ id: meetingId, scheduled: true, ...schedule });
      remember(meetingId, schedule.title.trim(), true);
      setScheduleOpen(false);
    });
  const downloadCalendar = () => {
    const url = URL.createObjectURL(
      new Blob([calendar], { type: "text/calendar;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nexus-meeting.ics";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const makeBrief = () =>
    run("brief", async () => {
      if (!brief.title.trim() && !brief.goal.trim())
        throw new Error("Add a meeting title or goal first.");
      setResult(
        await readResponse(
          await api("/api/ai-brief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(brief),
          }),
        ),
      );
      setBriefOpen(true);
    });

  return (
    <Box className="workspace-shell">
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <Box component="header" className="workspace-header">
        <Link className="workspace-brand" to="/" aria-label="Nexus Meet home">
          <img src="/nexus-meet-logo.svg" alt="" width="32" height="32" />
          <span>Nexus Meet</span>
        </Link>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ThemeToggle />
          <Tooltip title="Sign out">
            <IconButton
              aria-label="Sign out"
              onClick={() =>
                run("signout", async () => {
                  await signOut();
                  navigate("/");
                })
              }
            >
              <LogoutRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <Avatar
            src={user.imageUrl}
            alt={user.fullName || "Your profile"}
            sx={{
              width: 36,
              height: 36,
              bgcolor: "var(--accent-muted)",
              color: "var(--text-primary)",
            }}
          >
            {user.firstName?.[0] || "Y"}
          </Avatar>
        </Stack>
      </Box>
      <Box component="main" id="workspace-main" className="workspace-main">
        <Box className="workspace-intro">
          <Box>
            <Typography className="workspace-eyebrow">
              Your workspace
            </Typography>
            <Typography component="h1">Ready when you are.</Typography>
            <Typography color="text.secondary">
              A clear space to connect, collaborate, and decide what comes next.
            </Typography>
          </Box>
          <Chip
            variant="outlined"
            icon={<VideoCallRounded />}
            label="Built for better conversations"
            sx={{ display: { xs: "none", md: "inline-flex" } }}
          />
        </Box>
        <Box className="workspace-grid">
          <Box
            component="section"
            aria-labelledby="start-heading"
            className="workspace-card start-card"
          >
            <Box className="card-icon">
              <VideoCallRounded />
            </Box>
            <Typography component="h2" id="start-heading">
              Make room for your next idea.
            </Typography>
            <Typography color="text.secondary">
              Start a private meeting, then invite your team with a link.
            </Typography>
            <Box
              className="camera-preview"
              aria-label="Your meeting preferences"
            >
              <Avatar
                src={user.imageUrl}
                alt=""
                sx={{
                  width: 76,
                  height: 76,
                  bgcolor: "var(--accent-muted)",
                  color: "var(--text-primary)",
                  fontSize: "1.75rem",
                }}
              >
                {displayName?.[0]?.toUpperCase() || "Y"}
              </Avatar>
              <Typography fontWeight={600}>
                {displayName.trim() || "Your meeting name"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Camera and microphone connect when you join.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip
                  title={micOn ? "Join with microphone on" : "Join muted"}
                >
                  <IconButton
                    aria-label="Microphone preference"
                    aria-pressed={micOn}
                    onClick={() => setMicOn((value) => !value)}
                    className={micOn ? "preference-on" : "preference-off"}
                  >
                    {micOn ? <MicRounded /> : <MicOffRounded />}
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title={
                    videoOn ? "Join with camera on" : "Join with camera off"
                  }
                >
                  <IconButton
                    aria-label="Camera preference"
                    aria-pressed={videoOn}
                    onClick={() => setVideoOn((value) => !value)}
                    className={videoOn ? "preference-on" : "preference-off"}
                  >
                    {videoOn ? <VideocamRounded /> : <VideocamOffRounded />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
            <TextField
              fullWidth
              label="Your display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <Box className="workspace-primary-actions">
              <Button
                variant="contained"
                size="large"
                startIcon={
                  busy === "create" ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <AddRounded />
                  )
                }
                onClick={create}
                disabled={Boolean(busy)}
              >
                Start a meeting
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<CalendarMonthRounded />}
                onClick={() => {
                  setCalendar("");
                  setScheduleOpen(true);
                }}
                disabled={Boolean(busy)}
              >
                Schedule
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Only people with your invitation link can join after signing in.
            </Typography>
          </Box>
          <Box className="workspace-secondary">
            <Box
              component="section"
              aria-labelledby="join-heading"
              className="workspace-card"
            >
              <Box className="card-heading">
                <Box className="card-icon">
                  <LinkRounded />
                </Box>
                <Typography component="h2" id="join-heading">
                  Have an invitation?
                </Typography>
              </Box>
              <Typography color="text.secondary">
                Paste a meeting link or ID to join the conversation.
              </Typography>
              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  join();
                }}
                className="join-form"
              >
                <TextField
                  fullWidth
                  label="Meeting link or ID"
                  placeholder="Paste your invitation here"
                  value={invitation}
                  onChange={(event) => setInvitation(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 2048 } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!invitation.trim() || Boolean(busy)}
                >
                  {busy === "join" ? "Joining…" : "Join meeting"}
                </Button>
              </Box>
            </Box>
            <Box
              component="section"
              aria-labelledby="brief-heading"
              className="workspace-card"
            >
              <Box className="card-heading">
                <Box className="card-icon">
                  <AutoAwesomeRounded />
                </Box>
                <Typography component="h2" id="brief-heading">
                  Go in with a plan.
                </Typography>
              </Box>
              <Typography color="text.secondary">
                Turn your goal into a focused agenda and useful questions.
              </Typography>
              <Stack spacing={2} sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Meeting title"
                  value={brief.title}
                  onChange={(event) =>
                    setBrief((value) => ({
                      ...value,
                      title: event.target.value,
                    }))
                  }
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
                <TextField
                  fullWidth
                  label="What do you want to achieve?"
                  multiline
                  minRows={2}
                  value={brief.goal}
                  onChange={(event) =>
                    setBrief((value) => ({
                      ...value,
                      goal: event.target.value,
                    }))
                  }
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
                <Button
                  variant="outlined"
                  startIcon={
                    busy === "brief" ? (
                      <CircularProgress size={18} />
                    ) : (
                      <AutoAwesomeRounded />
                    )
                  }
                  onClick={makeBrief}
                  disabled={Boolean(busy)}
                >
                  Prepare an agenda
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
        <Box
          component="section"
          aria-labelledby="recent-heading"
          className="workspace-card recent-card"
        >
          <Box className="card-heading">
            <HistoryRounded color="action" />
            <Typography component="h2" id="recent-heading">
              Recent meetings
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ ml: "auto" }}
            >
              On this device
            </Typography>
          </Box>
          {!recent.length ? (
            <Box className="workspace-empty">
              <HistoryRounded />
              <Typography fontWeight={600}>
                Your next conversation starts here.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Meetings you create or join will appear here for quick access.
              </Typography>
            </Box>
          ) : (
            <Box component="ul" className="recent-list">
              {recent.map((meeting) => (
                <Box component="li" key={meeting.id} className="recent-row">
                  <Box className="recent-identity">
                    <Box className="card-icon">
                      <VideoCallRounded />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={600} noWrap>
                        {meeting.title}
                      </Typography>
                      <Typography
                        noWrap
                        variant="body2"
                        color="text.secondary"
                        title={meeting.id}
                      >
                        {meeting.id}
                      </Typography>
                    </Box>
                  </Box>
                  <Box className="recent-actions">
                    <Tooltip title="Copy meeting link">
                      <IconButton
                        aria-label={`Copy link for ${meeting.title}`}
                        onClick={() => copy(meeting.id)}
                      >
                        <ContentCopyRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCalendar("");
                        setShare({ id: meeting.id });
                      }}
                    >
                      Share
                    </Button>
                    <Button
                      variant="contained"
                      disabled={Boolean(busy)}
                      onClick={() => join(meeting.id, meeting.title)}
                    >
                      Join
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
        <Box component="footer" className="workspace-footer">
          <Typography variant="body2">Nexus Meet</Typography>
          <Typography variant="body2" color="text.secondary">
            Less friction. More connection.
          </Typography>
        </Box>
      </Box>
      <ShareDialog
        open={Boolean(share)}
        onClose={() => setShare(null)}
        meetingId={share?.id || ""}
        isScheduled={Boolean(share?.scheduled)}
        scheduledDate={share?.date}
        scheduledTime={share?.time}
      />
      {calendar && (
        <Box className="calendar-download">
          <Button
            variant="contained"
            startIcon={<DownloadRounded />}
            onClick={downloadCalendar}
          >
            Download calendar invitation
          </Button>
          <IconButton
            aria-label="Dismiss calendar download"
            onClick={() => setCalendar("")}
          >
            ×
          </IconButton>
        </Box>
      )}
      <Dialog
        open={scheduleOpen}
        onClose={() => {
          if (!busy) setScheduleOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="schedule-heading"
      >
        <DialogTitle id="schedule-heading">Plan a meeting</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              Create a link and a calendar invitation to share with your team.
            </Typography>
            <TextField
              label="Meeting title"
              value={schedule.title}
              onChange={(event) =>
                setSchedule((value) => ({
                  ...value,
                  title: event.target.value,
                }))
              }
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Box className="schedule-fields">
              <TextField
                label="Date"
                type="date"
                value={schedule.date}
                onChange={(event) =>
                  setSchedule((value) => ({
                    ...value,
                    date: event.target.value,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Time"
                type="time"
                value={schedule.time}
                onChange={(event) =>
                  setSchedule((value) => ({
                    ...value,
                    time: event.target.value,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <TextField
              label="Duration in minutes"
              type="number"
              value={schedule.duration}
              onChange={(event) =>
                setSchedule((value) => ({
                  ...value,
                  duration: event.target.value,
                }))
              }
              slotProps={{ htmlInput: { min: 5, max: 480 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setScheduleOpen(false)}
            disabled={Boolean(busy)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={prepareSchedule}
            disabled={
              Boolean(busy) ||
              !schedule.title.trim() ||
              !schedule.date ||
              !schedule.time
            }
          >
            {busy === "schedule" ? "Creating…" : "Create invitation"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="agenda-heading"
      >
        <DialogTitle id="agenda-heading">Your meeting agenda</DialogTitle>
        <DialogContent>
          {result && (
            <Stack spacing={3}>
              {[
                ["Agenda", result.agenda],
                ["Key questions", result.keyQuestions],
                ["Success criteria", result.successCriteria],
                ["Watch for", result.riskChecks],
              ].map(([title, items]) => (
                <Box key={title}>
                  <Typography component="h3" fontWeight={700}>
                    {title}
                  </Typography>
                  <Box component="ul" sx={{ pl: 2.5, color: "text.secondary" }}>
                    {(items || []).map((text, index) => (
                      <li key={index}>{text}</li>
                    ))}
                  </Box>
                </Box>
              ))}
              <Divider />
              <Typography color="text.secondary">
                {result.openingScript}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBriefOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
      >
        <Alert
          severity={notice?.severity || "info"}
          onClose={() => setNotice(null)}
          sx={{ width: "100%" }}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

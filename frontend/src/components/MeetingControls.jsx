import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CallEndRounded,
  ChatBubbleOutlineRounded,
  MicRounded,
  MicOffRounded,
  MoreHorizRounded,
  VideocamRounded,
  VideocamOffRounded,
} from "@mui/icons-material";

export default function MeetingControls({
  micOn,
  videoOn,
  toggleMic,
  toggleVideo,
  leave,
  openChat,
  chatOpen,
  unread,
  children,
}) {
  const [anchor, setAnchor] = useState(null);
  const paperRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    if (anchor) paperRef.current?.focus();
  }, [anchor]);
  const closeTools = () => {
    setAnchor(null);
    triggerRef.current?.focus();
  };
  const actions = [
    {
      label: micOn ? "Mute microphone" : "Unmute microphone",
      icon: micOn ? <MicRounded /> : <MicOffRounded />,
      onClick: toggleMic,
      pressed: micOn,
      muted: !micOn,
    },
    {
      label: videoOn ? "Turn camera off" : "Turn camera on",
      icon: videoOn ? <VideocamRounded /> : <VideocamOffRounded />,
      onClick: toggleVideo,
      pressed: videoOn,
      muted: !videoOn,
    },
    {
      label: "Open meeting chat",
      icon: (
        <Badge color="error" badgeContent={unread} max={99}>
          <ChatBubbleOutlineRounded />
        </Badge>
      ),
      onClick: openChat,
      pressed: chatOpen,
    },
  ];
  return (
    <Box component="footer" className="meeting-controls">
      <Box
        role="group"
        aria-label="Meeting controls"
        className="meeting-control-dock"
      >
        {actions.map((action) => (
          <Tooltip key={action.label} title={action.label}>
            <IconButton
              aria-label={action.label}
              aria-pressed={action.pressed}
              onClick={action.onClick}
              className={action.muted ? "control-muted" : ""}
            >
              {action.icon}
            </IconButton>
          </Tooltip>
        ))}
        <Tooltip title="More meeting tools">
          <IconButton
            ref={triggerRef}
            aria-label="More meeting tools"
            aria-haspopup="dialog"
            aria-expanded={Boolean(anchor)}
            aria-controls={anchor ? "meeting-tools" : undefined}
            onKeyDown={(event) => {
              if (event.key === "Escape" && anchor) closeTools();
            }}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            <MoreHorizRounded />
          </IconButton>
        </Tooltip>
        <Box className="control-divider" />
        <Tooltip title="Leave meeting">
          <IconButton
            aria-label="Leave meeting"
            className="control-leave"
            onClick={leave}
          >
            <CallEndRounded />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography className="meeting-control-hint" variant="body2">
        Your meeting, at your pace.
      </Typography>
      <Popover
        id="meeting-tools"
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={closeTools}
        keepMounted
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          paper: {
            ref: paperRef,
            tabIndex: -1,
            inert: !anchor,
            role: "dialog",
            "aria-label": "More meeting tools",
            onKeyDown: (event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closeTools();
              }
            },
            sx: {
              p: 2,
              mb: 2,
              width: 300,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: 3,
            },
          },
        }}
      >
        <Typography
          component="h2"
          fontSize="1rem"
          fontWeight={700}
          sx={{ mb: 2 }}
        >
          Meeting tools
        </Typography>
        <Box className="meeting-secondary-tools" onClick={closeTools}>
          {children}
        </Box>
      </Popover>
    </Box>
  );
}

import { Box, Container, Typography } from "@mui/material";
import {
  CheckRounded,
  GraphicEqRounded,
  NotesRounded,
  VideocamRounded,
} from "@mui/icons-material";

export default function ProductPreview() {
  return (
    <Box
      component="section"
      aria-labelledby="preview-heading"
      sx={{ py: { xs: 7, md: 10 }, borderBlock: "1px solid var(--bg-border)" }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            textAlign: "center",
            mb: { xs: 4, md: 6 },
            maxWidth: 640,
            mx: "auto",
          }}
        >
          <Typography className="section-label" sx={{ mb: 2 }}>
            One connected workspace
          </Typography>
          <Typography
            component="h2"
            id="preview-heading"
            sx={{
              fontSize: { xs: "1.875rem", md: "2.75rem" },
              fontWeight: 700,
              letterSpacing: "-0.04em",
              mb: 2,
            }}
          >
            Stay present. Keep the next steps.
          </Typography>
          <Typography color="text.secondary">
            Bring video, captions, and useful meeting notes into one focused
            space.
          </Typography>
        </Box>
        <Box
          component="figure"
          sx={{
            m: 0,
            border: "1px solid var(--bg-border)",
            borderRadius: { xs: 2, md: 4 },
            bgcolor: "var(--bg-surface)",
            overflow: "hidden",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              p: { xs: 2, md: 2.5 },
              borderBottom: "1px solid var(--bg-border)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <VideocamRounded sx={{ color: "var(--color-primary)" }} />
              <Typography fontWeight={700}>Design review</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Workspace preview
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                md: "minmax(0, 1.4fr) minmax(0, 1fr)",
              },
            }}
          >
            <Box sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: { xs: 1.5, md: 2 },
                }}
              >
                {[
                  ["A", "Alex", "var(--accent-muted)"],
                  ["J", "Jamie", "var(--bg-surface)"],
                ].map(([initial, name, background]) => (
                  <Box
                    key={name}
                    sx={{
                      aspectRatio: "1 / 1",
                      position: "relative",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 2,
                      bgcolor: "var(--bg-elevated)",
                      border: "1px solid var(--bg-border)",
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 56, sm: 84 },
                        height: { xs: 56, sm: 84 },
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: background,
                        color: "var(--text-primary)",
                        fontSize: { xs: "1.5rem", md: "2rem" },
                        fontWeight: 600,
                      }}
                    >
                      {initial}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        position: "absolute",
                        bottom: 12,
                        left: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {name}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  p: 2,
                  mt: 2,
                  borderRadius: 2,
                  bgcolor: "var(--bg-elevated)",
                  alignItems: "flex-start",
                }}
              >
                <GraphicEqRounded
                  sx={{ color: "var(--color-primary)", flexShrink: 0 }}
                />
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                    Captions, close to the conversation
                  </Typography>
                  <Typography color="text.secondary">
                    “Let’s keep the first experience simple and make the next
                    step clear.”
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                borderLeft: { md: "1px solid var(--bg-border)" },
                borderTop: { xs: "1px solid var(--bg-border)", md: 0 },
                minWidth: 0,
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}
              >
                <NotesRounded sx={{ color: "var(--color-primary)" }} />
                <Typography component="h3" fontWeight={700}>
                  From discussion to direction
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2.5,
                  border: "1px solid var(--bg-border)",
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                  A shared decision
                </Typography>
                <Typography color="text.secondary">
                  Keep the onboarding flow focused on one clear first action.
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2.5,
                  border: "1px solid var(--bg-border)",
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                  A practical next step
                </Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <CheckRounded
                    sx={{ color: "var(--color-primary)", flexShrink: 0 }}
                  />
                  <Typography color="text.secondary">
                    Review the updated prototype together.
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                Review meeting insights with your team before turning them into
                commitments.
              </Typography>
            </Box>
          </Box>
          <Box
            component="figcaption"
            sx={{
              px: { xs: 2, md: 3 },
              py: 2,
              borderTop: "1px solid var(--bg-border)",
              color: "var(--text-secondary)",
              fontSize: ".875rem",
            }}
          >
            Illustrative preview. Your meeting content appears during your
            session.
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

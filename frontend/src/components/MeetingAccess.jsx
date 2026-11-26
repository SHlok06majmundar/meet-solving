import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi, readResponse } from '../services/api';

export default function MeetingAccess({ children }) {
  const { meetingId } = useParams();
  const api = useApi();
  const [state, setState] = useState({ id: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    api(`/api/meetings/${encodeURIComponent(meetingId)}/join`, { method: 'POST', signal: controller.signal })
      .then(readResponse)
      .then(() => { if (!controller.signal.aborted) setState({ id: meetingId, error: '' }); })
      .catch(error => { if (!controller.signal.aborted) setState({ id: meetingId, error: error.message }); });
    return () => controller.abort();
  }, [meetingId, api]);
  if (state.id !== meetingId) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><CircularProgress aria-label="Joining meeting" /></Box>;
  if (state.error) return <Box sx={{ maxWidth: 560, mx: 'auto', p: 4 }}><Alert severity="error">{state.error}</Alert><Button component={Link} to="/dashboard">Back to dashboard</Button></Box>;
  return children;
}

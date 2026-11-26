import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import ErrorBoundary from './components/ErrorBoundary';
import RequireSession from './components/RequireSession';
import MeetingAccess from './components/MeetingAccess';

const Dashboard = lazy(() => import('./Dashboard'));
const Meet = lazy(() => import('./Meet'));
const Landing = lazy(() => import('./Landing'));
const meeting = <RequireSession><MeetingAccess><Meet /></MeetingAccess></RequireSession>;

export default function App() {
  return <BrowserRouter><ErrorBoundary>
    <Suspense fallback={<Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><CircularProgress aria-label="Loading page" /></Box>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<RequireSession><Dashboard /></RequireSession>} />
        <Route path="/meet/:meetingId" element={meeting} />
        <Route path="/meeting/:meetingId" element={meeting} />
        <Route path="/join/:meetingId" element={meeting} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </Suspense>
  </ErrorBoundary></BrowserRouter>;
}

import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { SessionExpiredModal } from './components/common/SessionExpiredModal';
import { SESSION_EXPIRED_EVENT } from './lib/api';

// React Query client setup - configured for instant live sync without manual browser refreshes
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true, // Auto-refetch when tab is focused
      refetchOnMount: 'always',   // Always fetch fresh data on navigation across all pages
      staleTime: 0,               // 0ms stale time: never serve stale cached data when user enters new records
    },
  },
});

function App() {
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    const handleExpired = () => {
      setShowExpiredModal(true);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  const handleLoginAgain = () => {
    setShowExpiredModal(false);
    window.location.href = '/login';
  };

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <SessionExpiredModal
        isOpen={showExpiredModal}
        onLoginAgain={handleLoginAgain}
      />
    </QueryClientProvider>
  );
}

export default App;

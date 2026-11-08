import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { SessionExpiredModal } from './components/common/SessionExpiredModal';
import { SESSION_EXPIRED_EVENT } from './lib/api';

// React Query client setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
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

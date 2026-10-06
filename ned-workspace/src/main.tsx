import './polyfill.ts'; // Buffer before anything that loads web3.js
import './config.ts'; // configureCore before the first query
import './styles/fonts.css'; // self-hosted, no Google request (P4)
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, MotionConfig, domMax } from 'motion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.tsx';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { WalletPanelProvider } from './components/WalletPanelContext.tsx';
import { followReducedMotion } from './motion.ts';

followReducedMotion();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LazyMotion features={domMax} strict>
          <MotionConfig reducedMotion="user">
            <WalletPanelProvider>
              <App />
            </WalletPanelProvider>
          </MotionConfig>
        </LazyMotion>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);

/* The machines of a moment: the computer (/pc) and the phone (/phone). Their own page and styles — the portal's
   never load here. No router at this level: the sites inside a machine (Facebook) run routers of their own. */
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './device.css';
import './apps.css';
import './phone.css';
import './fb/fb.css';
import './skins.css';

const Pc = lazy(() => import('./pc/Pc'));
const Phone = lazy(() => import('./phone/Phone'));

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5 * 60_000 } } });

document.documentElement.classList.add('dv-root');
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#000000');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <Suspense fallback={<div className="dv-stage" />}>
        {/^\/phone(\/|$)/.test(window.location.pathname) ? <Phone /> : <Pc />}
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
);

// Stack Mapping Contract — frontend conventions for this project (Doc 12 Successor,
// rows 3/7/8/9, blueprint-silent -> best practice chosen here):
//   - Routing: react-router-dom (BrowserRouter), one <Route> per screen.
//   - Structure: package-by-feature under src/features/{module}/{components,hooks,api,types},
//     cross-feature code under src/shared/.
//   - Naming: components PascalCase.tsx, hooks camelCase.ts prefixed `use`,
//     other modules camelCase.ts.
//   - Testing: Jest + React Testing Library, co-located Xxx.test.tsx / useXxx.test.ts.
//   - Data fetching: plain fetch via shared/api/httpClient.ts (JWT bearer attached
//     from the token issued by the Security/Identity sprint's login flow).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

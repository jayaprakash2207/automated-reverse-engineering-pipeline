// Convention choice (UI/UX Doc 20 and the Stack Mapping Contract leave frontend
// routing unspecified): React Router v6 (<BrowserRouter>/<Routes>/<Route>) for
// client-side routing. Feature folders live under src/features/{module}/
// {components,hooks,api,types}; cross-cutting code lives under src/shared/,
// per Stack Mapping Contract row 9 (frontend half).
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './shared/auth/AuthContext';
import { AuditLogPage } from './features/audit-log/pages/AuditLogPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/audit-logs" element={<AuditLogPage />} />
          <Route path="/" element={<Navigate to="/audit-logs" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

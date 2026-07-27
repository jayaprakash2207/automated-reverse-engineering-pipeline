// Frontend convention (Stack Mapping Contract rows 3/8/9 are blueprint-silent on UI
// shape): React function components + hooks, TypeScript, feature-folder structure
// (src/features/{module}, src/shared), react-router-dom for routing, and a thin
// fetch-based API client — no third-party UI framework, per Document 20 §7 (visual
// design system explicitly out of scope). Merge payrollRoutes into the app's existing
// router alongside routes owned by other sprints' feature modules.
import { RouteObject } from 'react-router-dom';
import { PayPeriodListPage } from './components/PayPeriodListPage';
import { PayrollRunListPage } from './components/PayrollRunListPage';
import { PayrollRunDetailPage } from './components/PayrollRunDetailPage';

export const payrollRoutes: RouteObject[] = [
  { path: '/pay-periods', element: <PayPeriodListPage /> },
  { path: '/payroll-runs', element: <PayrollRunListPage /> },
  { path: '/payroll-runs/:runId', element: <PayrollRunDetailPage /> },
];

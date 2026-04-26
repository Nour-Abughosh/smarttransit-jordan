import { createBrowserRouter } from 'react-router';
import { Root } from './screens/Root';
import { Home } from './screens/Home';
import { RouteResults } from './screens/RouteResults';
import { LiveTracking } from './screens/LiveTracking';
import { AlertsSchedule } from './screens/AlertsSchedule';
import { MyRoutes } from './screens/MyRoutes';
import { NotFound } from './screens/NotFound';
import { Login } from './screens/Login';
import { OperatorDashboard } from './screens/operator/OperatorDashboard';
import { RequireAuth, RedirectBasedOnRole } from '../lib/auth';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: RedirectBasedOnRole },
      { path: 'login', Component: Login },
      {
        path: 'home',
        element: <RequireAuth role="passenger"><Home /></RequireAuth>,
      },
      {
        path: 'results',
        element: <RequireAuth role="passenger"><RouteResults /></RequireAuth>,
      },
      {
        path: 'tracking',
        element: <RequireAuth role="passenger"><LiveTracking /></RequireAuth>,
      },
      {
        path: 'alerts',
        element: <RequireAuth role="passenger"><AlertsSchedule /></RequireAuth>,
      },
      {
        path: 'my-routes',
        element: <RequireAuth role="passenger"><MyRoutes /></RequireAuth>,
      },
      {
        path: 'operator',
        element: <RequireAuth role="operator"><OperatorDashboard /></RequireAuth>,
      },
      { path: '*', Component: NotFound },
    ],
  },
]);

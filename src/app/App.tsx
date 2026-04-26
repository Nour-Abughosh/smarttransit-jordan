import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from '../lib/auth';
import { LangProvider } from '../lib/i18n';

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LangProvider>
  );
}

import { RouterProvider } from 'react-router';
import { APIProvider } from '@vis.gl/react-google-maps';
import { router } from './routes';
import { AuthProvider } from '../lib/auth';
import { LangProvider } from '../lib/i18n';

export default function App() {
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  return (
    <APIProvider apiKey={mapsKey}>
      <LangProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </LangProvider>
    </APIProvider>
  );
}

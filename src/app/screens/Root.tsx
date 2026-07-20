import { Outlet, useLocation } from 'react-router';
import { Navbar } from '../components/Navbar';
import { MobileBottomNav } from '../components/MobileBottomNav';
export function Root() {
  const location = useLocation();
  const isOperator = location.pathname.startsWith('/operator');
  if (isOperator) return <Outlet />;
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}

import { Outlet } from 'react-router';
import { Navbar } from '../components/Navbar';
import { MobileBottomNav } from '../components/MobileBottomNav';

export function Root() {
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

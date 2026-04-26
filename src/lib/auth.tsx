import { createContext, useContext, useState, ReactNode } from 'react';
import { Navigate } from 'react-router';

interface User {
  username: string;
  name: string;
  role: 'passenger' | 'operator';
}

export const MOCK_USERS: Record<string, User> = {
  amman_commuter: {
    username: 'amman_commuter',
    name: 'Amman Commuter',
    role: 'passenger',
  },
  fleet_admin_01: {
    username: 'fleet_admin_01',
    name: 'Fleet Admin',
    role: 'operator',
  },
};

interface AuthContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('st_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (username: string) => {
    const u = MOCK_USERS[username];
    if (u) {
      setUser(u);
      try { sessionStorage.setItem('st_user', JSON.stringify(u)); } catch {}
    }
  };

  const logout = () => {
    setUser(null);
    try { sessionStorage.removeItem('st_user'); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role?: 'passenger' | 'operator';
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'operator' ? '/operator' : '/home'} replace />;
  }
  return <>{children}</>;
}

export function RedirectBasedOnRole() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'operator' ? '/operator' : '/home'} replace />;
}

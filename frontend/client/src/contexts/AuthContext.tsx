import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

// API 基础地址
const API_URL = 'https://8000-ivh0049fr7agzxljd4dgb-e1a18941.us1.manus.computer/api/v1';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: {
    id: number;
    name: string;
    display_name: string;
    permissions: Record<string, boolean>;
  };
  avatar_url?: string;
  is_superuser: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Record<string, boolean>;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      // 如果有 token 但没有用户信息，说明是初始化加载或刷新页面，需要验证 token
      // 如果已经有用户信息（通常是刚登录），则跳过验证，避免重复请求导致的问题
      if (token && !user) {
        try {
          // 验证 token 并获取用户信息
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token 无效
            console.warn('Token validation failed, logging out');
            logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token, user]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    setLocation('/');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setLocation('/login');
  };

  // 提取当前用户的权限
  const permissions = user?.role?.permissions || {};

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isAuthenticated: !!user, 
      isLoading, 
      permissions,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { API_URL };

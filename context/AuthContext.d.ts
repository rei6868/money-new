import type { ReactNode } from 'react';

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export declare function AuthProvider(props: AuthProviderProps): JSX.Element;
export declare function useAuth(): AuthContextValue;

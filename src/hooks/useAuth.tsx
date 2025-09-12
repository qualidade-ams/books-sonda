
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let lastLogTime = 0;
    const LOG_DEBOUNCE = 1000; // 1 segundo

    // Função para verificar se a sessão ainda é válida
    const isSessionValid = (session: Session | null): boolean => {
      if (!session) return false;
      
      // Verificar se o token não expirou
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      
      // Considerar sessão inválida se expira em menos de 5 minutos
      return expiresAt > (now + 300);
    };

    // Função para tentar conectar com retry
    const initializeAuth = async () => {
      try {
        // Configurar listener de mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            // Apenas logar eventos importantes e com debounce
            const now = Date.now();
            if ((event === 'SIGNED_IN' || event === 'SIGNED_OUT') && now - lastLogTime > LOG_DEBOUNCE) {
              lastLogTime = now;
            }
            
            if (mounted) {
              // Verificar validade da sessão
              if (session && !isSessionValid(session)) {
                await supabase.auth.signOut();
                return;
              }
              
              setSession(session);
              setUser(session?.user ?? null);
              if (!isReady) {
                setIsReady(true);
              }
              setLoading(false);
            }
          }
        );

        // Verificar sessão existente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Erro ao obter sessão:', error);
          throw error;
        }
        
        // Verificar se a sessão existente ainda é válida
        if (session && !isSessionValid(session)) {
          await supabase.auth.signOut();
          if (mounted) {
            setSession(null);
            setUser(null);
            setIsReady(true);
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsReady(true);
          setLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };

      } catch (error) {
        console.error('AuthProvider: Erro na inicialização:', error);
        
        if (retryCount < maxRetries && mounted) {
          retryCount++;
          setTimeout(() => {
            if (mounted) {
              initializeAuth();
            }
          }, 2000);
        } else {
          console.error('AuthProvider: Máximo de tentativas atingido ou componente desmontado');
          if (mounted) {
            setIsReady(true);
            setLoading(false);
          }
        }
      }
    };

    const cleanup = initializeAuth();

    return () => {
      mounted = false;
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => {
          if (cleanupFn && typeof cleanupFn === 'function') {
            cleanupFn();
          }
        });
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('AuthProvider: Erro de login:', error.message);
          return { error };
        }
        
        return { error: null };

      } catch (error) {
        console.error('AuthProvider: Erro de rede no login:', error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          return { 
            error: { 
              message: 'Erro de conexão. Verifique sua internet e tente novamente.' 
            } 
          };
        }
      }
    }

    return { 
      error: { 
        message: 'Erro de conexão após múltiplas tentativas.' 
      } 
    };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });
      
      if (error) {
        console.error('AuthProvider: Erro de registro:', error);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error('AuthProvider: Erro de rede no registro:', error);
      return { 
        error: { 
          message: 'Erro de conexão. Verifique sua internet e tente novamente.' 
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthProvider: Erro no logout:', error);
        throw error;
      }
      
      // Limpar dados locais
      sessionStorage.clear();
      localStorage.removeItem('last_activity');
      
      // Forçar limpeza do estado
      setSession(null);
      setUser(null);
      
    } catch (error) {
      console.error('AuthProvider: Erro no logout:', error);
      
      // Mesmo com erro, limpar dados locais
      sessionStorage.clear();
      localStorage.removeItem('last_activity');
      setSession(null);
      setUser(null);
      
      throw error;
    }
  };

  const value = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    loading,
    isReady,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

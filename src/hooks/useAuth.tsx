
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearAllAppCache } from '@/services/clearAllAppCache';

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
    let currentUserId: string | null = null; // Track current user to avoid unnecessary re-renders
    let activeCheckDone = false; // Track if active check was already done for this user

    // Função para verificar se a sessão ainda é válida
    const isSessionValid = (session: Session | null): boolean => {
      if (!session) return false;
      
      // Verificar se o token não expirou
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      
      // Considerar sessão inválida se expira em menos de 5 minutos
      return expiresAt > (now + 300);
    };

    // Verificação de ativo em background (não bloqueia o estado)
    const checkUserActive = async (userId: string) => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('active')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.warn('AuthProvider: Erro ao verificar status ativo, permitindo acesso:', profileError.message);
          return true; // Permitir acesso em caso de erro
        }
        
        if (profile && profile.active === false) {
          console.warn('AuthProvider: Usuário inativo detectado, encerrando sessão');
          return false;
        }
        
        return true; // Usuário ativo ou não encontrado (permitir)
      } catch (err) {
        console.warn('AuthProvider: Exceção ao verificar status ativo, permitindo acesso:', err);
        return true; // Permitir acesso em caso de exceção
      }
    };

    // Função para tentar conectar com retry
    const initializeAuth = async () => {
      try {
        // Configurar listener de mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;

            // SIGNED_OUT - limpar estado
            if (event === 'SIGNED_OUT') {
              currentUserId = null;
              activeCheckDone = false;
              setSession(null);
              setUser(null);
              setIsReady(true);
              setLoading(false);
              return;
            }

            // Para TOKEN_REFRESHED, a sessão nova já é válida (acabou de ser renovada)
            // Não verificar isSessionValid aqui pois pode causar loop
            if (event !== 'TOKEN_REFRESHED') {
              // Verificar validade da sessão apenas para outros eventos
              if (session && !isSessionValid(session)) {
                await supabase.auth.signOut();
                return;
              }
            }

            // TOKEN_REFRESHED: Se o usuário é o mesmo, apenas atualizar session silenciosamente
            // Isso evita re-renders desnecessários que causam loading nas telas
            if (event === 'TOKEN_REFRESHED' && session?.user?.id === currentUserId) {
              // Atualizar session ref sem causar re-render de user (mesmo ID)
              setSession(session);
              return;
            }

            // SIGNED_IN ou mudança de usuário: verificar ativo
            if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
              const userId = session.user.id;
              
              // Se é o mesmo usuário e já verificamos, não verificar novamente
              if (userId === currentUserId && activeCheckDone) {
                setSession(session);
                setUser(session.user);
                if (!isReady) setIsReady(true);
                setLoading(false);
                return;
              }

              // Setar estado imediatamente para desbloquear a UI
              // A verificação de "ativo" é feita em background sem bloquear
              currentUserId = userId;
              setSession(session);
              setUser(session.user);
              setIsReady(true);
              setLoading(false);

              // Verificar ativo em background (não bloqueia renderização)
              checkUserActive(userId).then((isActive) => {
                if (!mounted) return;
                if (!isActive) {
                  console.warn('AuthProvider: Usuário inativo detectado em background, encerrando sessão');
                  supabase.auth.signOut();
                  currentUserId = null;
                  activeCheckDone = false;
                  setSession(null);
                  setUser(null);
                } else {
                  activeCheckDone = true;
                }
              });
              return;
            }
            
            // Fallback para outros eventos
            setSession(session);
            setUser(session?.user ?? null);
            if (!isReady) setIsReady(true);
            setLoading(false);
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
          if (session?.user) {
            currentUserId = session.user.id;
            activeCheckDone = true; // O onAuthStateChange vai verificar
          }
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('AuthProvider: Erro de login:', error.message);
          return { error };
        }

        // Verificar se o usuário está ativo na tabela profiles
        if (data?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('active')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.error('AuthProvider: Erro ao verificar status do usuário:', profileError);
            // Se não conseguir verificar, permitir login (fallback seguro)
          } else if (profile && profile.active === false) {
            // Usuário inativo - fazer logout imediatamente
            await supabase.auth.signOut();
            return {
              error: {
                message: 'Sua conta está desativada. Entre em contato com o administrador do sistema.'
              }
            };
          }
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
      
      // Limpar TODOS os caches da aplicação (isLogout limpa sessionStorage inteiro)
      clearAllAppCache(undefined, { isLogout: true });
      
      // Forçar limpeza do estado
      setSession(null);
      setUser(null);
      
    } catch (error) {
      console.error('AuthProvider: Erro no logout:', error);
      
      // Mesmo com erro, limpar dados locais
      clearAllAppCache(undefined, { isLogout: true });
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

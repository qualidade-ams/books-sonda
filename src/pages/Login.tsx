
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Clock } from 'lucide-react';
import '../styles/login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, user, isReady } = useAuth();



  // Mostrar mensagem de sessão expirada se houver
  useEffect(() => {
    const state = location.state as { message?: string };
    if (state?.message) {
      toast({
        title: "Sessão Expirada",
        description: state.message,
        variant: "destructive",
        duration: 5000,
      });
      // Limpar o state para não mostrar novamente
      navigate('/', { replace: true });
    }
  }, [location.state, toast, navigate]);

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (user && isReady) {
      navigate('/admin/dashboard');
    }
  }, [user, isReady, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        console.error('Login: Erro no login:', error);

        let errorMessage = "Erro ao fazer login. Tente novamente.";

        if (error.message && error.message.includes('Invalid login credentials')) {
          errorMessage = "E-mail ou senha incorretos.";
        } else if (error.message && error.message.includes('Email not confirmed')) {
          errorMessage = "Por favor, confirme seu e-mail antes de fazer login.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast({
          title: "Erro no login",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o dashboard...",
        });
      }
    } catch (error) {
      console.error('Login: Erro inesperado no login:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading se AuthProvider ainda não estiver pronto
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Inicializando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-cover bg-center backdrop-blur-sm items-center justify-center p-4" style={{ backgroundImage: "url('/images/login-sonda.jpg')" }}>
      <Card className="w-full max-w-4xl shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
            {/* Lado esquerdo - Imagem */}
            <div className="relative overflow-hidden bg-cover bg-center"
              style={{ backgroundImage: "url('/images/login-sonda2.jpg')" }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center text-white p-8">
                  <img
                    src="/images/sonda-logo.png"
                    alt="Sonda Logo"
                    className="mx-auto mb-6 h-16 w-auto filter brightness-0 invert"
                    onError={(e) => {
                      console.log('Login: Erro ao carregar logo');
                      e.currentTarget.style.display = 'none';
                    }}
                  />                  
                </div>
              </div>
            </div>

            {/* Lado direito - Formulário de Login */}
            <div className="flex items-center justify-center p-8 bg-white">
              <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Bem-vindo
                  </h1>
                  <p className="text-gray-600">
                    Faça login para acessar sua conta
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>                
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

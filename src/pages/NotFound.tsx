import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-cover bg-center backdrop-blur-sm items-center justify-center p-4" style={{ backgroundImage: "url('/images/login-sonda.jpg')" }}>
      {/* Card centralizado */}
      <div className="bg-white/10 backdrop-blur-lg shadow-2xl rounded-2xl max-w-lg w-full p-10 text-center border border-white/20">
        <h1 className="text-7xl font-extrabold text-blue-600 drop-shadow-lg">
          404
        </h1>
        <p className="mt-4 text-xl font-medium text-white">
          Oops! Página não encontrada
        </p>
        <p className="mt-2 text-sm text-white">
          O caminho <span className="font-bold text-blue-600">{location.pathname}</span> não existe.
        </p>

        <div className="mt-6">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300"
          >
            Voltar para o Início
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

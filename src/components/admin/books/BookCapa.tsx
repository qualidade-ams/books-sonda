/**
 * BookCapa - Componente da capa do book
 * Design baseado no layout oficial Sonda com logo grande e informações do book
 */

import type { BookCapaData } from '@/types/books';

interface BookCapaProps {
  data: BookCapaData;
}

export default function BookCapa({ data }: BookCapaProps) {
  // Log para debug
  console.log('📄 Dados da capa:', {
    empresa_nome: data.empresa_nome,
    empresa_nome_abreviado: data.empresa_nome_abreviado,
    periodo: data.periodo
  });

  return (
    <div className="relative min-h-[600px] bg-white overflow-hidden">
      {/* Fundo azul Sonda */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8]">
        {/* Logo N grande como background - posicionado à direita */}
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[60%] h-[80%] flex items-center justify-center">
          <img 
            src="/images/logo-capa-book.png" 
            alt="Logo Sonda N" 
            className="w-full h-full object-contain opacity-20"
            style={{ filter: 'brightness(1.2)' }}
          />
        </div>
      </div>

      {/* Conteúdo da capa */}
      <div className="relative z-10 h-full min-h-[600px] flex flex-col justify-between p-12">
        {/* Área superior com nome da empresa e Book Mensal */}
        <div className="flex-1 flex items-center">
          <div className="text-white space-y-8 max-w-[55%]">
            {/* Nome da Empresa Abreviado */}
            <div className="space-y-3">
              <h2 className="text-3xl font-light tracking-wider uppercase opacity-90">
                {data.empresa_nome_abreviado || data.empresa_nome}
              </h2>
              <h1 className="text-7xl font-bold tracking-tight leading-tight">
                Book Mensal
              </h1>
            </div>
          </div>
        </div>

        {/* Área inferior com período e logos */}
        <div className="space-y-8">
          {/* Período em destaque */}
          <div>
            <div className="inline-block">
              <div className="text-8xl font-bold tracking-tight text-[#2563eb] bg-white px-10 py-6 rounded-xl shadow-2xl">
                {data.periodo}
              </div>
            </div>
          </div>

          {/* Rodapé com logos e créditos */}
          <div className="flex items-end justify-between">
            {/* Fonte/Crédito */}
            <div className="text-white text-sm opacity-60">
              Fonte: Aranda
            </div>

            {/* Logo Sonda */}
            <div className="bg-white px-6 py-3 rounded-lg shadow-lg">
              <img 
                src="/images/sonda-logo.png" 
                alt="Sonda Logo" 
                className="h-10 w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

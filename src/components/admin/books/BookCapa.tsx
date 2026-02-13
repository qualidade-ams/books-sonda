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
    <div className="relative min-h-[500px] bg-white overflow-hidden">
      {/* Fundo azul Sonda */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8]">
        {/* Logo N grande como background - posicionado à direita */}
        <div className="absolute right-[-5%] top-1/3 -translate-y-1/2 w-[50%] h-[80%] flex items-center justify-center">
          <img 
            src="/images/logo-capa-book.png" 
            alt="Logo Sonda N" 
            className="w-full h-full object-contain"
            style={{ filter: 'brightness(1.2)' }}
          />
        </div>
      </div>

      {/* Conteúdo da capa */}
      <div className="relative z-10 h-full min-h-[500px] flex flex-col justify-between p-12">
        {/* Área superior com nome da empresa e Book Mensal */}
        <div className="flex-1 flex items-center">
          <div className="text-white space-y-8 max-w-[55%]">
            {/* Nome da Empresa Abreviado */}
            <div className="space-y-3 mt-48">
              <h2 className="text-6xl font-light tracking-wider uppercase opacity-90">
                {data.empresa_nome_abreviado || data.empresa_nome}
              </h2>
              <h1 className="text-6xl font-bold tracking-tight leading-tight">
                Book Mensal
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-white overflow-hidden">
        {/* Fundo Branco */}
        {/* Área com período e logo alinhados */}
        <div className="flex items-center justify-between p-12">
          {/* Lado esquerdo: Período */}
          <div className="inline-block">
            <div className="text-6xl font-bold tracking-tight text-white bg-[#2563eb] px-10 py-6 rounded-xl shadow-2xl">
              {data.periodo}
            </div>
          </div>

          {/* Lado direito: Logo Sonda - alinhado verticalmente com o texto */}
          <div className="flex items-center mt-5 mr-10">
            <img 
              src="/images/sonda-logo.png"
              alt="Logo Sonda"
              className="w-48 h-auto"
            />
          </div>
        </div>

        {/* Rodapé com créditos - mais próximo do conteúdo */}
        <div className="px-12 pb-6">
          <div className="text-[#2563eb] text-sm">
            Fonte: Aranda
          </div>
        </div>
      </div>
    </div>
  );
}

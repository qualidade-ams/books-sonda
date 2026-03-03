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
    <div className="relative h-[2400px] bg-white overflow-hidden">
      {/* Fundo azul Sonda */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8]" style={{ height: '65%' }}>
        {/* Logo N grande como background - posicionado à direita */}
        <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[50%] h-[70%] flex items-center justify-center">
          <img 
            src="/images/logo-capa-book.png" 
            alt="Logo Sonda N" 
            className="w-full h-full object-contain"
            style={{ filter: 'brightness(1.2)' }}
          />
        </div>
      </div>

      {/* Conteúdo da capa */}
      <div className="relative z-10 flex flex-col justify-between" style={{ height: '65%' }}>
        {/* Área superior com nome da empresa e Book Mensal */}
        <div className="flex-1 flex items-center px-20 pt-16">
          <div className="text-white space-y-6 max-w-[55%]">
            {/* Nome da Empresa Abreviado */}
            <div className="space-y-2">
              <h2 className="text-5xl font-light tracking-wider uppercase opacity-90">
                {data.empresa_nome_abreviado || data.empresa_nome}
              </h2>
              <h1 className="text-5xl font-bold tracking-tight leading-tight">
                Book Mensal
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-white overflow-hidden" style={{ height: '35%' }}>
        {/* Fundo Branco */}
        {/* Área com período e logo alinhados */}
        <div className="flex items-center justify-between px-20 py-8">
          {/* Lado esquerdo: Período */}
          <div className="inline-block">
            <div className="text-5xl font-bold tracking-tight text-white bg-[#2563eb] px-8 py-5 rounded-xl shadow-2xl">
              {data.periodo}
            </div>
          </div>

          {/* Lado direito: Logo Sonda - alinhado verticalmente com o texto */}
          <div className="flex items-center">
            <img 
              src="/images/sonda-logo.png"
              alt="Logo Sonda"
              className="w-40 h-auto"
            />
          </div>
        </div>

        {/* Rodapé com créditos - mais próximo do conteúdo */}
        <div className="px-20 pb-4">
          <div className="text-[#2563eb] text-sm">
            Fonte: Aranda
          </div>
        </div>
      </div>
    </div>
  );
}

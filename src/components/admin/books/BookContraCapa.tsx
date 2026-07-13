/**
 * BookContraCapa - Contra capa do book (última página)
 * Fundo azul Sonda com logo centralizada
 */

import BookFooterBar from './BookFooterBar';

export default function BookContraCapa() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Fundo azul Sonda inteiro */}
      <div className="absolute inset-0 bg-[#2563eb]" />

      {/* Logo centralizada */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <img
          src="/images/logo-sonda.png"
          alt="Logo Sonda"
          className="w-[1000px] h-auto"
        />
      </div>

      <BookFooterBar />
    </div>
  );
}

/**
 * BookFooterBar - Barra decorativa inferior para abas do book
 * Linha azul Sonda + detalhe cinza no rodapé de cada página
 * Usa margens negativas para compensar o padding da page-section no PDF
 */

export default function BookFooterBar() {
  return (
    <div 
      className="absolute bottom-0 left-0 right-0 flex book-footer-bar"
    >
      <div className="flex-1 h-2 bg-[#2563eb]" />
      <div className="w-[15%] h-2 bg-gray-300" />
    </div>
  );
}

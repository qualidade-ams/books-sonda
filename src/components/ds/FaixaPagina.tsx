import type { ReactNode } from 'react';

/**
 * Faixa escura do topo das telas do DS v2, com a foto de marca. Dentro do AdminLayout
 * (decisão de 23/10/2026): tema, sino e usuário ficam no cabeçalho do app; a faixa traz só
 * o título da tela, as ações e os indicadores, que flutuam sobre a borda de baixo.
 */
export function FaixaPagina({ children }: { children: ReactNode }) {
  return (
    // 20 px além dos cartões de cada lado (-mx-5 + px-5): os indicadores ficam flutuando sobre a faixa
    <section className="ds-faixa-topo relative -mx-4 overflow-hidden rounded-2xl bg-[var(--ds-faixa-bg)] text-white md:-mx-5">
      {/* Foto de marca à direita, fundida no fundo da faixa (public/images/login-sonda.jpg, já usada no login) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-full bg-[url('/images/login-sonda.jpg')] bg-cover bg-[center_35%] opacity-70 [mask-image:linear-gradient(to_right,transparent_5%,rgba(0,0,0,0.3)_45%,black_88%)] md:w-[72%]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_right,transparent_35%,black_60%,transparent_90%)]"
      />
      <div
        aria-hidden
        className="ds-flutuar pointer-events-none absolute -bottom-36 left-1/4 h-[260px] w-[260px] rounded-full bg-[#006F7D] opacity-30 blur-[90px]"
      />
      {/* Hero recuado 20 px em relação aos cartões (pedido em 15/10/2026) */}
      <div className="relative px-4 pt-6 md:px-5 md:pl-10">{children}</div>
    </section>
  );
}

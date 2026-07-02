/**
 * BookPortfolio - Componente de Portfólio de Soluções
 * Exibe o portfólio próprio de soluções de negócio da Sonda
 * Layout baseado na apresentação oficial com imagens dos produtos
 */

import BookFooterBar from './BookFooterBar';

interface BookPortfolioProps {
  empresaNome?: string;
}

// Dados dos produtos do portfólio na ordem das imagens
const PORTFOLIO_ITEMS = [
  {
    id: 1,
    image: '/images/portifolio/1 - Gallery.jpeg',
    name: 'Gallery',
    description: 'Solução Fiscal + atualizações Reforma Tributária add-on SAP TDF e SAP DRC (estatutário)',
  },
  {
    id: 2,
    image: '/images/portifolio/2 - Comply.jpeg',
    name: 'Comply',
    description: 'Solução Fiscal/Contábil completa + atualizações Reforma Tributária On premise ou SaaS',
  },
  {
    id: 3,
    image: '/images/portifolio/3 - Analitycs.jpeg',
    name: 'Comply Analytics',
    description: 'Dashboards intuitivos, relatórios atualizados e indicadores estratégicos',
  },
  {
    id: 4,
    image: '/images/portifolio/4 - E-DOCS.jpeg',
    name: 'E-DOCS',
    description: 'Solução robusta de Mensageria para NF-e, NFS-e, CT-e e NFCOM',
  },
  {
    id: 5,
    image: '/images/portifolio/5 - BPO.jpeg',
    name: 'BPO Fiscal e Contábil',
    description: 'Outsourcing de processos fiscais e alocações de recursos especializados',
  },
  {
    id: 6,
    image: '/images/portifolio/6 - CE Plus.jpeg',
    name: 'CE Plus',
    description: 'Solução de Comércio Exterior para processos de: Exportação, Importação, Câmbio, Drawback, Regimes Especiais.',
  },
  {
    id: 7,
    image: '/images/portifolio/7 - CE Plus Latam.jpeg',
    name: 'CE Plus Latam',
    description: 'Solução para processos de operações de Importação e Exportação nos países da América Latina',
  },
  {
    id: 8,
    image: '/images/portifolio/8 - CE Plus Catálogo de Produtos.jpeg',
    name: 'CE Plus Catálogo de Produtos',
    description: 'Integração com Siscomex',
  },
  {
    id: 9,
    image: '/images/portifolio/9 - CE Plus Recof.jpeg',
    name: 'CE Plus Recof',
    description: 'Solução para Regime Aduaneiro de Entreposto Industrial',
  },
  {
    id: 10,
    image: '/images/portifolio/10 - FCI.jpeg',
    name: 'FCI',
    description: 'Solução para Ficha de Conteúdo de Importação',
  },
  {
    id: 11,
    image: '/images/portifolio/11 - Fluxo de Caixa.jpeg',
    name: 'Fluxo de Caixa',
    description: 'Gerenciamento ágil das rotinas de Fluxo de Caixa',
  },
  {
    id: 12,
    image: '/images/portifolio/12 - SAPC.jpeg',
    name: 'SAPC',
    description: 'Gerenciamento dos Pagamentos de Comissões',
  },
  {
    id: 13,
    image: '/images/portifolio/13 - Vendor.jpeg',
    name: 'Vendor',
    description: 'Sistema de Controle de Operações Vendor',
  },
];

export default function BookPortfolio({ empresaNome }: BookPortfolioProps) {
  // Linha 1: itens 1-4, Linha 2: itens 5-8, Linha 3: itens 9-13
  const firstRow = PORTFOLIO_ITEMS.slice(0, 4);
  const secondRow = PORTFOLIO_ITEMS.slice(4, 8);
  const thirdRow = PORTFOLIO_ITEMS.slice(8);

  return (
    <div className="w-full h-full bg-white p-8 flex flex-col relative">
      {/* Título da Seção */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Portfolio próprio | <span className="text-blue-600">Soluções de Negócio</span>
        </h2>
        <p className="text-muted-foreground mt-1">
          Conheça as soluções próprias da Sonda para o seu negócio
        </p>
      </div>

      {/* Conteúdo com borda arredondada - ocupa todo o espaço disponível */}
      <div className="flex-1 border-2 rounded-[35.5px] p-10 min-h-0" style={{ borderColor: '#666666' }}>
        <div className="flex flex-col justify-center space-y-10 h-full">
          {/* Primeira Linha - 4 itens */}
          <div className="flex justify-center">
            <div className="grid grid-cols-4 gap-8 items-start">
              {firstRow.map((item) => (
                <div key={item.id} className="flex flex-col items-center text-center">
                  <div className="w-full flex items-center justify-center mb-4" style={{ height: '160px' }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1 leading-tight">
                    {item.name}:
                  </h4>
                  <p className="text-base text-gray-600 leading-snug">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Segunda Linha - 4 itens */}
          <div className="flex justify-center">
            <div className="grid grid-cols-4 gap-8 items-start">
              {secondRow.map((item) => (
                <div key={item.id} className="flex flex-col items-center text-center">
                  <div className="w-full flex items-center justify-center mb-4" style={{ height: '160px' }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1 leading-tight">
                    {item.name}:
                  </h4>
                  <p className="text-base text-gray-600 leading-snug">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Terceira Linha - 5 itens */}
          <div className="flex justify-center">
            <div className="grid grid-cols-5 gap-8 items-start">
              {thirdRow.map((item) => (
                <div key={item.id} className="flex flex-col items-center text-center">
                  <div className="w-full flex items-center justify-center mb-4" style={{ height: '160px' }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1 leading-tight">
                    {item.name}:
                  </h4>
                  <p className="text-base text-gray-600 leading-snug">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wrapper para imagem decorativa - colada nos cantos da página */}
      <div 
        className="absolute overflow-hidden pointer-events-none portfolio-bg-image" 
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <img
          src="/images/n-sonda-azul.png"
          alt=""
          className="absolute opacity-10"
          style={{ width: '40%', bottom: '-5%', right: '-3%', objectFit: 'contain' }}
        />
      </div>

      <BookFooterBar />
    </div>
  );
}

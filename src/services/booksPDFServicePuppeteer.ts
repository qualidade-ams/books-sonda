/**
 * Serviço para geração de PDFs de Books usando Puppeteer
 * Substitui completamente o @react-pdf/renderer
 * 
 * Gera HTML completo e envia para API Puppeteer para conversão em PDF
 * Mantém 100% de fidelidade visual ao layout web
 */

import type { BookData } from '@/types/books';
import { puppeteerPDFService } from './puppeteerPDFService';

class BooksPDFServicePuppeteer {
  /**
   * Gera HTML completo do book para conversão em PDF
   */
  private gerarHTMLCompleto(bookData: BookData): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book ${bookData.empresa_nome} - ${bookData.mes}/${bookData.ano}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: white;
      color: #111827;
      line-height: 1.5;
    }

    /* Configuração de página para impressão */
    @page {
      size: 395mm 225mm; /* Landscape customizado */
      margin: 0;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* Cores Sonda */
    :root {
      --sonda-blue: #2563eb;
      --sonda-dark-blue: #1d4ed8;
      --sonda-light-blue: #3b82f6;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-600: #4b5563;
      --gray-900: #111827;
    }

    .page {
      width: 395mm;
      height: 225mm;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    /* Capa */
    .capa {
      background: linear-gradient(to bottom, var(--sonda-blue) 70%, white 70%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0;
    }

    .capa-superior {
      flex: 0.7;
      position: relative;
      padding: 40px;
      display: flex;
      margin-right: 20px;
      align-items: flex-end;
    }

    .capa-logo-n {
      position: absolute;
      right: -10px;
      top: 50%;
      transform: translateY(-50%);
      width: 40%;
      height: 102%;
      object-fit: cover;
    }

    .capa-conteudo {
      z-index: 10;
      color: white;
    }

    .capa-empresa {
      font-size: 48pt;
      font-weight: 300;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: -20px;
    }

    .capa-titulo {
      font-size: 48pt;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .capa-inferior {
      flex: 0.3;
      background: white;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .capa-periodo-box {
      background: var(--sonda-blue);
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      font-size: 38pt;
      font-weight: 700;
    }

    .capa-fonte {
      color: var(--sonda-blue);
      font-size: 10pt;
      margin-top: 30px;
    }

    .capa-logo-sonda {
      height: 50px;
      margin-right: 60px;
    }

    /* Páginas internas */
    .page-content {
      padding: 15px 25px;
    }

    .page-header {
      margin-bottom: 12px;
    }

    .page-title {
      font-size: 18pt;
      font-weight: 400;
      color: #1f2937;
    }

    .page-title .empresa-nome {
      color: var(--sonda-blue);
      font-weight: 700;
    }

    .page-subtitle {
      font-size: 9pt;
      color: #9ca3af;
      font-weight: 400;
    }

    /* Cards de métricas */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .metric-card {
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }

    .metric-label {
      font-size: 8pt;
      font-weight: 600;
      color: var(--gray-600);
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 32pt;
      font-weight: 700;
    }

    .metric-value.blue { color: var(--sonda-blue); }
    .metric-value.orange { color: #ea580c; }
    .metric-value.purple { color: #9333ea; }
    .metric-value.gray { color: var(--gray-900); }
    .metric-value.green { color: #10b981; }
    .metric-value.red { color: #ef4444; }

    /* Cards de métricas simplificados (novo layout) - COMPACTOS */
    .metrics-grid-simple {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }

    .metric-card-simple {
      background: white;
      border: 2px solid #0d6abf;
      border-radius: 35.5px;
      padding: 16px;
      display: flex;
      flex-direction: column;
    }

    .metric-label-simple {
      font-size: 7pt;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 8px;
      padding-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric-icon-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .metric-icon-circle.gray-bg {
      background: #f3f4f6;
    }

    .metric-icon-circle.blue-bg {
      background: #dbeafe;
    }

    .metric-icon-circle.yellow-bg {
      background: #fef3c7;
    }

    .metric-icon {
      width: 16px;
      height: 16px;
      display: inline-block;
    }

    .icon-file {
      fill: none;
      stroke: #4b5563;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .icon-trending {
      fill: none;
      stroke: #ca8a04;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .icon-alert {
      fill: none;
      stroke: #4b5563;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .metric-values {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .metric-row-value {
      font-size: 28pt;
      font-weight: 700;
      line-height: 1;
    }

    .metric-row-label {
      font-size: 8pt;
      color: #000000;
      text-transform: uppercase;
      font-weight: 400;
    }

    /* Cores dos valores */
    .value-gray { color: #000000; }
    .value-blue { color: #000000; }
    .value-orange { color: #f59e0b; }

    .metric-total-value {
      font-size: 28pt;
      font-weight: 700;
      line-height: 1;
    }

    .metric-subtitle {
      font-size: 6pt;
      color: #9ca3af;
      margin-top: 3px;
      font-weight: 400;
    }

    .metric-variation {
      font-size: 6pt;
      font-weight: 400;
      margin-top: 3px;
    }

    .metric-variation.positive { color: #10b981; }
    .metric-variation.negative { color: #ef4444; }

    /* Layout com gráfico e card lateral */
    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }

    .chart-container {
      background: white;
      border: 2px solid #0d6abf;
      border-radius: 35.5px;
      padding: 16px;
      position: relative;
    }

    .chart-title {
      font-size: 10pt;
      font-weight: 700;
      color: var(--gray-900);
      margin-bottom: 2px;
    }

    .chart-subtitle {
      font-size: 6pt;
      color: var(--gray-500);
      margin-bottom: 10px;
    }

    /* Wrapper do gráfico */
    .chart-wrapper {
      position: relative;
      width: 100%;
      height: 300px;
      margin-bottom: 8px;
    }
    
    /* Altura fixa para área de barras (250px = 300px - 15px top - 35px bottom) */
    :root {
      --chart-height: 250px;
    }

    /* Linha vertical do eixo Y */
    .chart-y-line {
      position: absolute;
      left: 32px;
      top: 15px;
      bottom: 35px;
      width: 2px;
      background: #e5e7eb;
      z-index: 1;
    }

    /* Linha horizontal do eixo X */
    .chart-x-line {
      position: absolute;
      left: 32px;
      right: 15px;
      bottom: 35px;
      height: 2px;
      background: #e5e7eb;
      z-index: 1;
    }

    /* Gráfico de barras CSS - IDÊNTICO AO MODAL */
    .chart-bars {
      position: absolute;
      left: 35px;
      right: 15px;
      top: 15px;
      bottom: 35px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      background: white;
      z-index: 2;
    }

    /* Eixo Y com escala */
    .chart-y-axis {
      position: absolute;
      left: 5px;
      top: 15px;
      bottom: 35px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 9pt;
      color: #9ca3af;
      line-height: 1;
      z-index: 3;
      width: 25px;
    }

    .chart-y-axis span {
      display: block;
      text-align: right;
    }

    /* Linhas de grade horizontais */
    .chart-grid-lines {
      position: absolute;
      left: 35px;
      right: 15px;
      top: 15px;
      bottom: 35px;
      pointer-events: none;
      z-index: 1;
    }

    .grid-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: #f0f0f0;
    }

    .chart-bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      max-width: 100px;
      position: relative;
    }

    .chart-bars-pair {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 250px; /* Altura fixa em pixels */
      margin-bottom: 0; /* Sem margem - barras coladas na linha X */
    }

    .chart-bar-wrapper {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      width: 32px;
      height: 100%;
    }

    .chart-bar {
      width: 100%;
      border-radius: 2px 2px 0 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      /* Altura será definida inline em pixels */
    }

    .chart-bar.bar-gray {
      background: #0d6abf;
    }

    .chart-bar.bar-blue {
      background: #2563eb;
    }

    .chart-bar .bar-value {
      color: white;
      font-size: 10pt;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .chart-bar-label {
      font-size: 9pt;
      color: #6b7280;
      text-transform: uppercase;
      margin-top: 10px; /* Espaço entre linha X e labels dos meses */
      text-align: center;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    /* Legenda do gráfico */
    .chart-legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .legend-color.legend-gray {
      background: #0d6abf;
    }

    .legend-color.legend-blue {
      background: #2563eb;
    }

    .legend-label {
      font-size: 7pt;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
    }

    /* Card lateral - COMPACTO */
    .side-card {
      background: white;
      border: 2px solid #0d6abf;
      border-radius: 35.5px;
      padding: 16px;
    }

    .side-card-title {
      font-size: 8pt;
      font-weight: 700;
      color: var(--gray-900);
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0.3px;
    }

    .side-card-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .grupo-item-compact {
      padding-bottom: 8px;
      border-bottom: 1px solid var(--gray-200);
    }

    .grupo-item-compact:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .grupo-header-compact {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .grupo-nome-compact {
      font-size: 7pt;
      font-weight: 700;
      color: var(--gray-900);
      line-height: 1.2;
    }

    .grupo-total-compact {
      font-size: 6pt;
      color: var(--gray-500);
    }

    .grupo-bars-compact {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .grupo-bar-compact {
      border-radius: 4px;
      padding: 6px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-width: 60px;
      transition: width 0.3s ease;
    }

    .gray-bar-compact {
      background: #0d6abf;
    }

    .blue-bar-compact {
      background: var(--sonda-blue);
    }

    .bar-value-compact {
      font-size: 11pt;
      font-weight: 700;
      line-height: 1;
      color: white;
    }

    .bar-label-compact {
      font-size: 6pt;
      text-transform: uppercase;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }

    /* Container de tabela */
    .table-container {
      background: white;
      border: 2px solid #0d6abf;
      border-radius: 35.5px;
      padding: 16px;
      overflow: hidden;
    }

    .table-title {
      font-size: 10pt;
      font-weight: 600;
      color: var(--gray-900);
      margin-bottom: 12px;
    }

    /* Tabelas */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      border-radius: 35.5px;
      overflow: hidden;
    }

    thead {
      background: var(--gray-50);
    }

    th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      color: var(--gray-700);
      border: none;
    }

    th.th-center {
      text-align: center;
    }

    th.th-abertos {
      background: #0d6abf;
      color: white;
    }

    th.th-fechados {
      background: #2563eb;
      color: white;
    }

    td {
      padding: 12px 16px;
      border: none;
      font-size: 8pt;
    }

    td.td-center {
      text-align: center;
    }

    td.td-abertos {
      background: #e3f2fd;
    }

    td.td-fechados {
      background: #eff6ff;
    }

    tbody tr {
      border-bottom: none;
    }

    tbody tr:hover {
      background: var(--gray-50);
    }

    tfoot {
      background: #0d6abf;
      color: white;
      font-weight: 700;
    }

    tfoot td {
      padding: 12px 16px;
    }

    tfoot:hover {
      background: #2563eb;
    }

    tfoot td {
      border: none;
      padding: 12px 16px;
    }

    /* Rodapé */
    .page-footer {
      position: absolute;
      bottom: 10px;
      left: 20px;
      right: 20px;
      padding-top: 10px;
      border-top: 1px solid var(--gray-200);
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: var(--gray-600);
    }
  </style>
</head>
<body>
  <!-- CAPA -->
  <div class="page capa">
    <div class="capa-superior">
      <img src="https://books-sonda.vercel.app/images/logo-capa-book.png" alt="Logo N" class="capa-logo-n" />
      <div class="capa-conteudo">
        <div class="capa-empresa">${(bookData.capa.empresa_nome_abreviado || bookData.empresa_nome).toUpperCase()}</div>
        <div class="capa-titulo">Book Mensal</div>
      </div>
    </div>
    <div class="capa-inferior">
      <div>
        <div class="capa-periodo-box">${bookData.capa.periodo}</div>
        <div class="capa-fonte">Fonte: Aranda</div>
      </div>
      <img src="https://books-sonda.vercel.app//images/sonda-logo.png" alt="Sonda" class="capa-logo-sonda" />
    </div>
  </div>

  <!-- VOLUMETRIA -->
  <div class="page">
    <div class="page-content">
      <div class="page-header">
        <div class="page-title">Volumetria <span class="empresa-nome">${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}</span></div>
        <div class="page-subtitle">Visão Geral de Chamados e Desempenho Operacional</div>
      </div>

      <!-- Cards de métricas - layout idêntico à aba -->
      <div class="metrics-grid-simple">
        <!-- Card 1: Abertos | Mês -->
        <div class="metric-card-simple">
          <div class="metric-label-simple">
            <div class="metric-icon-circle gray-bg">
              <svg class="metric-icon icon-file" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            ABERTOS | MÊS
          </div>
          <div class="metric-values">
            <div class="metric-row">
              <span class="metric-row-value value-gray">${bookData.volumetria.abertos_mes.solicitacao}</span>
              <span class="metric-row-label">SOLICITAÇÃO</span>
            </div>
            <div class="metric-row">
              <span class="metric-row-value value-gray">${bookData.volumetria.abertos_mes.incidente}</span>
              <span class="metric-row-label">INCIDENTE</span>
            </div>
          </div>
        </div>

        <!-- Card 2: Fechados | Mês -->
        <div class="metric-card-simple">
          <div class="metric-label-simple">
            <div class="metric-icon-circle blue-bg">
              <svg class="metric-icon icon-file" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            FECHADOS | MÊS
          </div>
          <div class="metric-values">
            <div class="metric-row">
              <span class="metric-row-value value-blue">${bookData.volumetria.fechados_mes.solicitacao}</span>
              <span class="metric-row-label">SOLICITAÇÃO</span>
            </div>
            <div class="metric-row">
              <span class="metric-row-value value-blue">${bookData.volumetria.fechados_mes.incidente}</span>
              <span class="metric-row-label">INCIDENTE</span>
            </div>
          </div>
        </div>

        <!-- Card 3: SLA Médio -->
        <div class="metric-card-simple">
          <div class="metric-label-simple">
            <div class="metric-icon-circle yellow-bg">
              <svg class="metric-icon icon-trending" viewBox="0 0 24 24">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
            SLA MÉDIO
          </div>
          <div class="metric-values">
            <div class="metric-row">
              <span class="metric-total-value value-orange">${bookData.volumetria.sla_medio.toFixed(1)}%</span>
            </div>
          </div>
          ${bookData.volumetria.sla_medio_variacao !== undefined && bookData.volumetria.sla_medio_variacao !== 0 ? `
            <div class="metric-variation ${bookData.volumetria.sla_medio_variacao > 0 ? 'positive' : 'negative'}">
              ${bookData.volumetria.sla_medio_variacao > 0 ? '↑' : '↓'} ${bookData.volumetria.sla_medio_variacao > 0 ? '+' : ''}${bookData.volumetria.sla_medio_variacao.toFixed(1)}% vs mês ant.
            </div>
          ` : ''}
        </div>

        <!-- Card 4: Total Backlog -->
        <div class="metric-card-simple">
          <div class="metric-label-simple">
            <div class="metric-icon-circle gray-bg">
              <svg class="metric-icon icon-alert" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            TOTAL BACKLOG
          </div>
          <div class="metric-values">
            <div class="metric-row">
              <span class="metric-total-value value-gray">${bookData.volumetria.total_backlog}</span>
            </div>
          </div>
          <div class="metric-subtitle">Pendentes de atuação</div>
        </div>
      </div>

      <!-- Layout: Coluna esquerda (gráfico + tabela) e direita (card lateral) -->
      <div class="content-grid">
        <!-- Coluna esquerda: Gráfico + Tabela -->
        <div style="display: flex; flex-direction: column; gap: 15px;">
          <!-- Gráfico: Chamados | Semestre -->
          <div class="chart-container">
            <div class="chart-title">Chamados | Semestre</div>
            <div class="chart-subtitle">Monitoramento do volume mensal (${bookData.volumetria.chamados_semestre && bookData.volumetria.chamados_semestre.length > 0 ? `${bookData.volumetria.chamados_semestre[0].mes}/${bookData.ano} - ${bookData.volumetria.chamados_semestre[bookData.volumetria.chamados_semestre.length - 1].mes}/${bookData.ano}` : ''})</div>
            
            <!-- Wrapper do gráfico com eixo Y e linhas de grade -->
            <div class="chart-wrapper">
              <!-- Eixo Y com escala dinâmica -->
              <div class="chart-y-axis">
                ${(() => {
                  const maxValue = bookData.volumetria.chamados_semestre && bookData.volumetria.chamados_semestre.length > 0
                    ? Math.max(...bookData.volumetria.chamados_semestre.map(d => Math.max(d.abertos, d.fechados)))
                    : 32;
                  const roundedMax = Math.ceil(maxValue / 4) * 4;
                  const step = roundedMax / 4;
                  return `
                <span>${roundedMax}</span>
                <span>${roundedMax - step}</span>
                <span>${roundedMax - step * 2}</span>
                <span>${roundedMax - step * 3}</span>
                <span>0</span>
                  `;
                })()}
              </div>
              
              <!-- Linha vertical do eixo Y com marcações -->
              <div class="chart-y-line">
                <div style="position: absolute; left: 0; top: 0%; width: 6px; height: 2px; background: #e5e7eb;"></div>
                <div style="position: absolute; left: 0; top: 25%; width: 6px; height: 2px; background: #e5e7eb;"></div>
                <div style="position: absolute; left: 0; top: 50%; width: 6px; height: 2px; background: #e5e7eb;"></div>
                <div style="position: absolute; left: 0; top: 75%; width: 6px; height: 2px; background: #e5e7eb;"></div>
                <div style="position: absolute; left: 0; top: 100%; width: 6px; height: 2px; background: #e5e7eb;"></div>
              </div>
              
              <!-- Linha horizontal do eixo X -->
              <div class="chart-x-line"></div>
              
              <!-- Linhas de grade horizontais -->
              <div class="chart-grid-lines">
                <div class="grid-line" style="top: 0%;"></div>
                <div class="grid-line" style="top: 25%;"></div>
                <div class="grid-line" style="top: 50%;"></div>
                <div class="grid-line" style="top: 75%;"></div>
                <div class="grid-line" style="top: 100%;"></div>
              </div>
              
              <!-- Gráfico de barras CSS -->
              <div class="chart-bars">
                ${bookData.volumetria.chamados_semestre && bookData.volumetria.chamados_semestre.length > 0 ? 
                  (() => {
                    const maxValue = Math.max(...bookData.volumetria.chamados_semestre.map(d => Math.max(d.abertos, d.fechados)));
                    const roundedMax = Math.ceil(maxValue / 4) * 4;
                    const chartHeightPx = 250;
                    
                    return bookData.volumetria.chamados_semestre.map(item => {
                      const abertosHeightPx = roundedMax > 0 ? Math.round((item.abertos / roundedMax) * chartHeightPx) : 0;
                      const fechadosHeightPx = roundedMax > 0 ? Math.round((item.fechados / roundedMax) * chartHeightPx) : 0;
                      
                      return '<div class="chart-bar-group">' +
                        '<div class="chart-bars-pair">' +
                          '<div class="chart-bar-wrapper">' +
                            '<div class="chart-bar bar-gray" style="height: ' + abertosHeightPx + 'px">' +
                              (item.abertos > 0 ? '<span class="bar-value">' + item.abertos + '</span>' : '') +
                            '</div>' +
                          '</div>' +
                          '<div class="chart-bar-wrapper">' +
                            '<div class="chart-bar bar-blue" style="height: ' + fechadosHeightPx + 'px">' +
                              (item.fechados > 0 ? '<span class="bar-value">' + item.fechados + '</span>' : '') +
                            '</div>' +
                          '</div>' +
                        '</div>' +
                        '<div class="chart-bar-label">' + item.mes.toUpperCase() + '</div>' +
                      '</div>';
                    }).join('');
                  })()
                : '<p style="text-align: center; color: #9ca3af; padding: 40px 0;">Sem dados</p>'}
              </div>
            </div>
            
            <!-- Legenda -->
            <div class="chart-legend">
              <div class="legend-item">
                <span class="legend-color legend-gray"></span>
                <span class="legend-label">ABERTOS</span>
              </div>
              <div class="legend-item">
                <span class="legend-color legend-blue"></span>
                <span class="legend-label">FECHADOS</span>
              </div>
            </div>
          </div>

          <!-- Tabela: Chamados X CAUSA -->
          <div class="table-container">
            <div class="table-title">Chamados X CAUSA</div>
            <table>
              <thead>
                <tr>
                  <th>ORIGEM</th>
                  <th class="th-center th-abertos">ABERTOS</th>
                  <th class="th-center th-fechados">FECHADOS</th>
                </tr>
              </thead>
              <tbody>
                ${bookData.volumetria.backlog_por_causa.map(item => `
                  <tr>
                    <td><strong>${item.origem}</strong></td>
                    <td class="td-center td-abertos">${item.abertos || 0}</td>
                    <td class="td-center td-fechados">${item.fechados || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>TOTAL</strong></td>
                  <td class="td-center">${bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + (item.abertos || 0), 0)}</td>
                  <td class="td-center">${bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + (item.fechados || 0), 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Coluna direita: Card lateral (altura total) -->
        <div class="side-card">
          <div class="side-card-title">CHAMADOS | GRUPO | MÊS</div>
          <div class="side-card-content">
            ${bookData.volumetria.chamados_por_grupo.slice(0, 5).map(grupo => {
              // Calcular largura proporcional das barras
              const maxValue = Math.max(grupo.abertos, grupo.fechados);
              const abertosWidth = maxValue > 0 ? (grupo.abertos / maxValue) * 100 : 0;
              const fechadosWidth = maxValue > 0 ? (grupo.fechados / maxValue) * 100 : 0;
              
              return `
              <div class="grupo-item-compact">
                <div class="grupo-header-compact">
                  <span class="grupo-nome-compact">${grupo.grupo}</span>
                  <span class="grupo-total-compact">Total: ${grupo.total}</span>
                </div>
                <div class="grupo-bars-compact">
                  <div class="grupo-bar-compact gray-bar-compact" style="width: ${abertosWidth}%">
                    <span class="bar-value-compact">${grupo.abertos}</span>
                    <span class="bar-label-compact">ABERTOS</span>
                  </div>
                  <div class="grupo-bar-compact blue-bar-compact" style="width: ${fechadosWidth}%">
                    <span class="bar-value-compact">${grupo.fechados}</span>
                    <span class="bar-label-compact">FECHADOS</span>
                  </div>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="page-footer">
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} - Sistema Books SND</span>
      <span>Página 2 de 6</span>
    </div>
  </div>

  <!-- Adicionar outras páginas aqui: SLA, Backlog, Consumo, Pesquisa -->
  
  <!-- SLA -->
  <div class="page">
    <div class="page-content">
      <div class="page-header">
        <div class="page-title">SLA ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}</div>
        <div class="page-subtitle">Nível de Serviço e Desempenho de Atendimento</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">SLA Atingido</div>
          <div class="metric-value ${bookData.sla.status === 'no_prazo' ? 'green' : 'red'}">${bookData.sla.sla_percentual.toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Fechados</div>
          <div class="metric-value blue">${bookData.sla.fechados}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Incidentes</div>
          <div class="metric-value purple">${bookData.sla.incidentes}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Violados</div>
          <div class="metric-value red">${bookData.sla.violados}</div>
        </div>
      </div>

      ${bookData.sla.chamados_violados && bookData.sla.chamados_violados.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>CHAMADO</th>
            <th>TIPO</th>
            <th style="text-align: center;">DATA ABERTURA</th>
            <th style="text-align: center;">DATA SOLUÇÃO</th>
            <th>GRUPO ATENDEDOR</th>
          </tr>
        </thead>
        <tbody>
          ${bookData.sla.chamados_violados.slice(0, 10).map(item => `
            <tr>
              <td><strong>${item.id_chamado}</strong></td>
              <td>${item.tipo}</td>
              <td style="text-align: center;">${item.data_abertura}</td>
              <td style="text-align: center;">${item.data_solucao}</td>
              <td>${item.grupo_atendedor}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${bookData.sla.chamados_violados.length > 10 ? `
      <div style="margin-top: 10px; text-align: center; color: var(--gray-600); font-size: 9pt;">
        Exibindo 10 de ${bookData.sla.chamados_violados.length} chamados violados
      </div>
      ` : ''}
      ` : `
      <div style="text-align: center; padding: 40px; color: var(--gray-600);">
        <div style="font-size: 14pt; font-weight: 600; margin-bottom: 10px;">✅ Nenhum chamado violado</div>
        <div style="font-size: 10pt;">Todos os chamados foram atendidos dentro do prazo estabelecido.</div>
      </div>
      `}
    </div>
    <div class="page-footer">
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} - Sistema Books SND</span>
      <span>Página 3 de 6</span>
    </div>
  </div>

  <!-- BACKLOG -->
  <div class="page">
    <div class="page-content">
      <div class="page-header">
        <div class="page-title">Backlog ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}</div>
        <div class="page-subtitle">Pendências e Envelhecimento de Chamados</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Backlog</div>
          <div class="metric-value gray">${bookData.backlog.total}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Incidentes</div>
          <div class="metric-value purple">${bookData.backlog.incidente}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Solicitações</div>
          <div class="metric-value blue">${bookData.backlog.solicitacao}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Grupos Ativos</div>
          <div class="metric-value orange">${bookData.backlog.distribuicao_por_grupo?.length || 0}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>CAUSA</th>
            <th style="text-align: center;">INCIDENTE</th>
            <th style="text-align: center;">SOLICITAÇÃO</th>
            <th style="text-align: center;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${bookData.backlog.backlog_por_causa.map(item => `
            <tr>
              <td><strong>${item.origem}</strong></td>
              <td style="text-align: center;">${item.incidente || 0}</td>
              <td style="text-align: center;">${item.solicitacao || 0}</td>
              <td style="text-align: center;"><strong>${item.total || 0}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>TOTAL</strong></td>
            <td style="text-align: center;">${bookData.backlog.backlog_por_causa.reduce((sum, item) => sum + (item.incidente || 0), 0)}</td>
            <td style="text-align: center;">${bookData.backlog.backlog_por_causa.reduce((sum, item) => sum + (item.solicitacao || 0), 0)}</td>
            <td style="text-align: center;">${bookData.backlog.backlog_por_causa.reduce((sum, item) => sum + (item.total || 0), 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="page-footer">
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} - Sistema Books SND</span>
      <span>Página 4 de 6</span>
    </div>
  </div>

  <!-- CONSUMO -->
  <div class="page">
    <div class="page-content">
      <div class="page-header">
        <div class="page-title">Consumo ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}</div>
        <div class="page-subtitle">Horas Consumidas e Baseline</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Horas Consumo</div>
          <div class="metric-value blue">${bookData.consumo.horas_consumo}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Baseline APL</div>
          <div class="metric-value gray">${bookData.consumo.baseline_apl}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">% Consumido</div>
          <div class="metric-value ${bookData.consumo.percentual_consumido > 100 ? 'red' : bookData.consumo.percentual_consumido > 80 ? 'orange' : 'green'}">${bookData.consumo.percentual_consumido.toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Requerimentos</div>
          <div class="metric-value purple">${bookData.consumo.requerimentos_descontados?.length || 0}</div>
        </div>
      </div>

      ${bookData.consumo.requerimentos_descontados && bookData.consumo.requerimentos_descontados.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>CHAMADO</th>
            <th>CLIENTE</th>
            <th>MÓDULO</th>
            <th style="text-align: center;">H FUNC</th>
            <th style="text-align: center;">H TEC</th>
            <th style="text-align: center;">TOTAL</th>
            <th style="text-align: right;">VALOR</th>
          </tr>
        </thead>
        <tbody>
          ${bookData.consumo.requerimentos_descontados.slice(0, 8).map(item => `
            <tr>
              <td><strong>${item.numero_chamado}</strong></td>
              <td>${item.cliente}</td>
              <td>${item.modulo}</td>
              <td style="text-align: center;">${item.horas_funcional || '--'}</td>
              <td style="text-align: center;">${item.horas_tecnica || '--'}</td>
              <td style="text-align: center;"><strong>${item.total_horas || '--'}</strong></td>
              <td style="text-align: right;">${item.valor_total ? `R$ ${item.valor_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '--'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${bookData.consumo.requerimentos_descontados.length > 8 ? `
      <div style="margin-top: 10px; text-align: center; color: var(--gray-600); font-size: 9pt;">
        Exibindo 8 de ${bookData.consumo.requerimentos_descontados.length} requerimentos
      </div>
      ` : ''}
      ` : `
      <div style="text-align: center; padding: 40px; color: var(--gray-600);">
        <div style="font-size: 14pt; font-weight: 600; margin-bottom: 10px;">Nenhum requerimento descontado</div>
        <div style="font-size: 10pt;">Não há requerimentos descontados neste período.</div>
      </div>
      `}
    </div>
    <div class="page-footer">
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} - Sistema Books SND</span>
      <span>Página 5 de 6</span>
    </div>
  </div>

  <!-- PESQUISA -->
  <div class="page">
    <div class="page-content">
      <div class="page-header">
        <div class="page-title">Pesquisa de Satisfação ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}</div>
        <div class="page-subtitle">Avaliação da Qualidade do Atendimento</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Respondidas</div>
          <div class="metric-value green">${bookData.pesquisa.pesquisas_respondidas}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Não Respondidas</div>
          <div class="metric-value orange">${bookData.pesquisa.pesquisas_nao_respondidas}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Enviadas</div>
          <div class="metric-value blue">${bookData.pesquisa.pesquisas_respondidas + bookData.pesquisa.pesquisas_nao_respondidas}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Taxa Resposta</div>
          <div class="metric-value purple">${bookData.pesquisa.pesquisas_respondidas + bookData.pesquisa.pesquisas_nao_respondidas > 0 ? ((bookData.pesquisa.pesquisas_respondidas / (bookData.pesquisa.pesquisas_respondidas + bookData.pesquisa.pesquisas_nao_respondidas)) * 100).toFixed(1) : 0}%</div>
        </div>
      </div>

      <div style="text-align: center; padding: 40px; color: var(--gray-600);">
        <div style="font-size: 14pt; font-weight: 600; margin-bottom: 10px;">📊 Dados de Pesquisa</div>
        <div style="font-size: 10pt;">
          ${bookData.pesquisa.pesquisas_respondidas > 0 
            ? `Total de ${bookData.pesquisa.pesquisas_respondidas} pesquisas respondidas neste período.`
            : 'Nenhuma pesquisa respondida neste período.'}
        </div>
      </div>
    </div>
    <div class="page-footer">
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} - Sistema Books SND</span>
      <span>Página 6 de 6</span>
    </div>
  </div>
  
</body>
</html>
    `.trim();
  }

  /**
   * Gera PDF completo do book
   */
  async gerarPDF(bookData: BookData): Promise<Blob> {
    try {
      console.log('📄 Gerando HTML do book...');
      const html = this.gerarHTMLCompleto(bookData);

      console.log('🚀 Enviando para API Puppeteer...');
      const blob = await puppeteerPDFService.gerarPDFDeHTML({
        html,
        filename: `book_${bookData.empresa_nome}_${bookData.mes}_${bookData.ano}.pdf`,
        options: {
          format: 'A4',
          orientation: 'landscape',
          printBackground: true,
          margin: {
            top: '0mm',
            bottom: '0mm',
            left: '0mm',
            right: '0mm'
          }
        }
      });

      console.log('✅ PDF gerado com sucesso!');
      return blob;
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      throw new Error('Não foi possível gerar o PDF do book');
    }
  }

  /**
   * Baixa PDF localmente
   */
  async baixarPDF(bookData: BookData, nomeArquivo?: string): Promise<void> {
    try {
      const blob = await this.gerarPDF(bookData);
      const filename = nomeArquivo || `book_${bookData.empresa_nome}_${bookData.mes}_${bookData.ano}.pdf`;
      
      puppeteerPDFService.baixarPDF(blob, filename);
    } catch (error) {
      console.error('❌ Erro ao baixar PDF:', error);
      throw error;
    }
  }

  /**
   * Abre PDF em nova aba
   */
  async abrirPDF(bookData: BookData): Promise<void> {
    try {
      const blob = await this.gerarPDF(bookData);
      puppeteerPDFService.abrirPDFNovaAba(blob);
    } catch (error) {
      console.error('❌ Erro ao abrir PDF:', error);
      throw error;
    }
  }
}

export const booksPDFServicePuppeteer = new BooksPDFServicePuppeteer();
export default booksPDFServicePuppeteer;

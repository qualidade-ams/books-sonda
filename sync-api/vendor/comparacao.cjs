// GERADO por sync-api/scripts/build-comparacao.mjs — não editar à mão.
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// sync-api/scripts/comparacao/entrada.ts
var entrada_exports = {};
__export(entrada_exports, {
  rodarModoSombra: () => rodarModoSombra
});
module.exports = __toCommonJS(entrada_exports);

// src/services/bancosHoras/cache.ts
function comCache(repo) {
  const guardadas = /* @__PURE__ */ new Map();
  const embrulhado = {};
  for (const nome of Object.keys(repo)) {
    const original = repo[nome];
    embrulhado[nome] = (...args) => {
      const chave2 = `${nome}:${JSON.stringify(args)}`;
      if (!guardadas.has(chave2)) {
        const promessa = original.apply(repo, args);
        promessa.catch(() => guardadas.delete(chave2));
        guardadas.set(chave2, promessa);
      }
      return guardadas.get(chave2);
    };
  }
  return embrulhado;
}

// src/services/bancosHoras/calculo.ts
function mesesDesdeVigencia(p, m) {
  return (m.ano - p.inicioVigencia.ano) * 12 + (m.mes - p.inicioVigencia.mes);
}
var depoisDoFim = (p, m) => !!p.fimVigencia && m.ano * 12 + m.mes > p.fimVigencia.ano * 12 + p.fimVigencia.mes;
function estaVigente(p, m) {
  return mesesDesdeVigencia(p, m) >= 0 && !depoisDoFim(p, m);
}
function ehFimDePeriodo(p, m) {
  if (!estaVigente(p, m)) return false;
  if (p.fimVigencia && p.fimVigencia.mes === m.mes && p.fimVigencia.ano === m.ano) return true;
  return (mesesDesdeVigencia(p, m) + 1) % p.periodoApuracao === 0;
}
function exigirVigente(p, m) {
  const indice6 = mesesDesdeVigencia(p, m);
  if (indice6 < 0) {
    throw new Error(`M\xEAs ${m.mes}/${m.ano} \xE9 antes do in\xEDcio da vig\xEAncia do banco`);
  }
  if (depoisDoFim(p, m)) {
    throw new Error(`M\xEAs ${m.mes}/${m.ano} \xE9 depois do fim da vig\xEAncia do banco`);
  }
  return indice6;
}
function inicioDoCiclo(p, m) {
  const indice6 = exigirVigente(p, m);
  const inicio = indice6 - indice6 % p.periodoApuracao;
  const total = p.inicioVigencia.ano * 12 + (p.inicioVigencia.mes - 1) + inicio;
  return { mes: total % 12 + 1, ano: Math.floor(total / 12) };
}
function validarPercentual(percentual) {
  if (percentual === void 0 || percentual === null || percentual < 0 || percentual > 100) {
    throw new Error(`Percentual de repasse inv\xE1lido: ${percentual}. Deve estar entre 0 e 100.`);
  }
  return percentual;
}
function calcularRepasse(saldo, percentual, unidade) {
  validarPercentual(percentual);
  if (saldo < 0) return saldo;
  const valor = saldo * percentual / 100;
  return unidade === "horas" ? Math.round(valor) : Math.floor(valor);
}
function calcularSaldo(entrada, repasseAnterior) {
  const saldoAUtilizar = entrada.baseline + repasseAnterior;
  const consumoTotal = entrada.consumo + entrada.requerimentos + entrada.reajusteSaida - entrada.reajusteEntrada;
  return {
    baseline: entrada.baseline,
    repasseAnterior,
    saldoAUtilizar,
    consumo: entrada.consumo,
    requerimentos: entrada.requerimentos,
    reajustes: entrada.reajusteEntrada - entrada.reajusteSaida,
    consumoTotal,
    saldo: saldoAUtilizar - consumoTotal
  };
}
function validarPorPeriodo(p) {
  const duracao = p.duracaoPeriodoMeses;
  const periodos = p.periodosAteZerar;
  if (!duracao || !periodos) {
    throw new Error("Repasse por per\xEDodo sem dura\xE7\xE3o ou quantidade de per\xEDodos");
  }
  if (duracao * periodos !== p.periodoApuracao) {
    throw new Error(
      `Repasse por per\xEDodo: o per\xEDodo de apura\xE7\xE3o (${p.periodoApuracao}) deve ser igual a dura\xE7\xE3o \xD7 per\xEDodos (${duracao} \xD7 ${periodos})`
    );
  }
  return { duracao, ciclo: duracao * periodos };
}
function aplicarRegraDeSaida(p, m, saldo, percentuais, unidade) {
  const indice6 = exigirVigente(p, m);
  const porPeriodo = p.repasseEspecial === "por_periodo" ? validarPorPeriodo(p) : null;
  if (ehFimDePeriodo(p, m)) {
    return {
      repasse: 0,
      excedente: saldo < 0 ? -saldo : 0,
      fimPeriodo: true,
      transicaoPeriodo: false
    };
  }
  if (porPeriodo) {
    const posicao = indice6 % porPeriodo.ciclo;
    const transicao = posicao % porPeriodo.duracao === porPeriodo.duracao - 1;
    const percentual = transicao ? percentuais.entrePeriodos : percentuais.dentroPeriodo;
    return {
      repasse: calcularRepasse(saldo, validarPercentual(percentual), unidade),
      excedente: 0,
      fimPeriodo: false,
      transicaoPeriodo: transicao
    };
  }
  return {
    repasse: calcularRepasse(saldo, percentuais.mensal, unidade),
    excedente: 0,
    fimPeriodo: false,
    transicaoPeriodo: false
  };
}
function valorExcedente(quantidade, unidade, taxa) {
  if (taxa === null || taxa === void 0) return 0;
  const valor = unidade === "horas" ? quantidade / 60 * taxa : quantidade * taxa;
  return Math.round(valor * 100) / 100;
}

// src/services/bancosHoras/classificacao.ts
var normalizar = (texto) => (texto ?? "").trim().toLowerCase();
function atendeEscopo(banco, produtoId, moduloId) {
  if (banco.escopo.length === 0) return true;
  if (!produtoId) return false;
  return banco.escopo.some(
    (e) => e.produtoId === produtoId && (e.moduloId === null || e.moduloId === moduloId)
  );
}
function atendeFiltro(banco, itemConfiguracao) {
  if (!banco.filtroIc) return true;
  if (itemConfiguracao === null || itemConfiguracao === void 0) return false;
  const item = normalizar(itemConfiguracao);
  const valor = normalizar(banco.filtroIc.valor);
  return banco.filtroIc.operador === "igual" ? item === valor : item.includes(valor);
}
function criarClassificador(bancos, dePara, mes) {
  const vigentes = bancos.filter((b) => b.ativo && estaVigente(b, mes));
  const solto = vigentes.find((b) => !b.padrao && b.escopo.length === 0 && !b.filtroIc);
  if (solto) {
    throw new Error(
      `Banco ${solto.bancoId} sem escopo e sem filtro: receberia tudo. Defina o escopo ou o filtro.`
    );
  }
  const candidatos = vigentes.filter((b) => !b.padrao).sort((a, b) => a.ordem - b.ordem);
  const padrao = vigentes.find((b) => b.padrao) ?? null;
  const grupos = new Map(dePara.filter((d) => d.ativo).map((d) => [normalizar(d.grupoAranda), d]));
  const porProdutoModulo = (produtoId, moduloId, itemConfiguracao) => {
    const banco = candidatos.find(
      (b) => atendeEscopo(b, produtoId, moduloId) && atendeFiltro(b, itemConfiguracao)
    );
    return (banco ?? padrao)?.bancoId ?? null;
  };
  return {
    porProdutoModulo,
    porGrupo(grupo, itemConfiguracao) {
      const d = grupos.get(normalizar(grupo));
      return porProdutoModulo(d?.produtoId ?? null, d?.moduloId ?? null, itemConfiguracao);
    }
  };
}

// src/services/bancosHoras/vigencias.ts
var primeiroDia = (m) => `${m.ano}-${String(m.mes).padStart(2, "0")}-01`;
function vigenteNoMes(vigencias, m) {
  const dia = primeiroDia(m);
  return vigencias.find((v) => v.dataInicio <= dia && (v.dataFim === null || v.dataFim >= dia));
}
function baselineDoMes(vigencias, m) {
  const v = vigenteNoMes(vigencias, m);
  if (!v) return { horas: 0, tickets: 0 };
  if (v.credito === "anual" && Number(v.dataInicio.slice(5, 7)) !== m.mes)
    return { horas: 0, tickets: 0 };
  return { horas: v.baselineMinutos ?? 0, tickets: v.baselineTickets ?? 0 };
}
function percentualDoMes(vigencias, m) {
  const v = vigenteNoMes(vigencias, m);
  if (!v) {
    throw new Error(`Banco sem percentual de repasse vigente em ${m.mes}/${m.ano}`);
  }
  const percentuais = { mensal: Number(v.percentualMensal) };
  if (v.percentualDentroPeriodo !== null)
    percentuais.dentroPeriodo = Number(v.percentualDentroPeriodo);
  if (v.percentualEntrePeriodos !== null)
    percentuais.entrePeriodos = Number(v.percentualEntrePeriodos);
  return percentuais;
}

// src/services/bancosHoras/consumoEntreBancos.ts
var UNIDADES = ["horas", "tickets"];
var podeCeder = (cedente, consumidor) => cedente.bancoId !== consumidor.bancoId && cedente.ativo && cedente.fimPeriodo && cedente.tipoContrato === consumidor.tipoContrato && cedente.periodoApuracao === consumidor.periodoApuracao;
function calcularConsumoEntreBancos(bancos) {
  const porOrdem = [...bancos].sort((a, b) => a.ordem - b.ordem);
  const porBanco = {};
  for (const b of bancos) {
    porBanco[b.bancoId] = {};
    for (const u of UNIDADES) {
      if (b.saldos[u] === void 0) continue;
      porBanco[b.bancoId][u] = {
        consumidoDeOutros: 0,
        cedidoAOutros: 0,
        saldoAposConsumoEntreBancos: b.saldos[u]
      };
    }
  }
  const transferencias = [];
  for (const consumidor of porOrdem.filter(
    (b) => b.ativo && b.consomeOutrosBancos && b.fimPeriodo
  )) {
    for (const unidade of UNIDADES) {
      const mov = porBanco[consumidor.bancoId][unidade];
      if (!mov || mov.saldoAposConsumoEntreBancos >= 0) continue;
      for (const cedente of porOrdem.filter((b) => podeCeder(b, consumidor))) {
        const deficit = -mov.saldoAposConsumoEntreBancos;
        if (deficit === 0) break;
        const movCedente = porBanco[cedente.bancoId][unidade];
        if (!movCedente || movCedente.saldoAposConsumoEntreBancos <= 0) continue;
        const quantidade = Math.min(deficit, movCedente.saldoAposConsumoEntreBancos);
        movCedente.saldoAposConsumoEntreBancos -= quantidade;
        movCedente.cedidoAOutros += quantidade;
        mov.saldoAposConsumoEntreBancos += quantidade;
        mov.consumidoDeOutros += quantidade;
        transferencias.push({
          cedenteId: cedente.bancoId,
          consumidorId: consumidor.bancoId,
          unidade,
          quantidade
        });
      }
    }
  }
  return { transferencias, porBanco };
}
var formatarHoras = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
var referenciaBanco = (preposicao, nome) => /^banco\b/i.test(nome.trim()) ? `${preposicao} ${nome}` : `${preposicao} banco ${nome}`;
function observacoesDaTransferencia(t, nomes) {
  if (t.unidade === "horas") {
    const q = formatarHoras(t.quantidade);
    return {
      consumidor: `${q} horas consumidas ${referenciaBanco("do", nomes.cedente)}`,
      cedente: `${q} horas cedidas ${referenciaBanco("ao", nomes.consumidor)}`
    };
  }
  const plural = t.quantidade === 1 ? "" : "s";
  return {
    consumidor: `${t.quantidade} ticket${plural} consumido${plural} ${referenciaBanco("do", nomes.cedente)}`,
    cedente: `${t.quantidade} ticket${plural} cedido${plural} ${referenciaBanco("ao", nomes.consumidor)}`
  };
}

// src/services/bancosHoras/taxas.ts
var FUNCOES_MEDIA = ["Funcional", "T\xE9cnico (Instala\xE7\xE3o / Atualiza\xE7\xE3o)", "ABAP - PL/SQL"];
var arredondar = (valor) => Math.round(valor * 100) / 100;
var preenchido = (valor) => valor !== null && valor !== void 0 && valor > 0;
function escolherTaxa(taxas, m, taxaProduto) {
  const dia = `${m.ano}-${String(m.mes).padStart(2, "0")}-01`;
  const candidatas = taxas.filter((t) => t.tipoProduto === taxaProduto && t.vigenciaInicio <= dia).sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio));
  return candidatas[0] ?? null;
}
var horaExcedenteDaFuncao = (f) => preenchido(f.valorAdicional) ? f.valorAdicional : arredondar(f.valorBase * 1.15);
function taxaHora(taxa, tipoHora) {
  const funcional = taxa.funcoesRemotas.find((f) => f.funcao === "Funcional");
  if (!funcional) return null;
  if (tipoHora === "normal") return funcional.valorBase;
  if (preenchido(funcional.valorAdicional)) return funcional.valorAdicional;
  if (taxa.tipoCalculoAdicional === "normal") return arredondar(funcional.valorBase * 1.15);
  const principais = taxa.funcoesRemotas.filter((f) => FUNCOES_MEDIA.includes(f.funcao));
  const soma = principais.reduce((s, f) => s + horaExcedenteDaFuncao(f), 0);
  return arredondar(soma / principais.length);
}
function taxaTicket(taxa) {
  const valor = [taxa.valorTicketExcedente, taxa.ticketExcedente2, taxa.ticketExcedente].find(
    preenchido
  );
  return valor ?? null;
}
var formatarHoras2 = (minutos) => `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, "0")}`;
function descricaoFaturamento(quantidade, unidade, m, valor) {
  const periodo = `${String(m.mes).padStart(2, "0")}/${m.ano}`;
  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
  const qtd = unidade === "horas" ? formatarHoras2(quantidade) : String(quantidade);
  return `Excedente de ${qtd} ${unidade} no per\xEDodo ${periodo} - Valor: ${valorFormatado}`;
}
var ALERTA_SEM_TAXA = "Taxa n\xE3o encontrada para o per\xEDodo. Excedente n\xE3o pode ser calculado.";

// src/services/bancosHoras/motorBancosHoras.ts
var indice = (m) => m.ano * 12 + (m.mes - 1);
var doIndice = (i) => ({ mes: i % 12 + 1, ano: Math.floor(i / 12) });
var chave = (m) => `${m.ano}-${m.mes}`;
var unidadesDoContrato = (b) => b.tipoContrato === "ambos" ? ["horas", "tickets"] : [b.tipoContrato];
var movimentoVazio = () => ({
  consumo: { minutos: 0, tickets: 0 },
  requerimentosHoras: 0,
  requerimentosTickets: 0,
  entrada: { minutos: 0, tickets: 0 },
  saida: { minutos: 0, tickets: 0 }
});
function entradaDaUnidade(b, m, mov, unidade) {
  const baseline = baselineDoMes(b.baselines, m);
  if (unidade === "horas") {
    return {
      baseline: baseline.horas,
      // D-02: em "ambos", os chamados não consomem horas
      consumo: b.tipoContrato === "ambos" ? 0 : mov.consumo.minutos,
      requerimentos: Math.round(mov.requerimentosHoras * 60),
      reajusteEntrada: mov.entrada.minutos,
      reajusteSaida: mov.saida.minutos
    };
  }
  return {
    baseline: baseline.tickets,
    consumo: mov.consumo.tickets,
    requerimentos: mov.requerimentosTickets,
    reajusteEntrada: mov.entrada.tickets,
    reajusteSaida: mov.saida.tickets
  };
}
function bancoDoRequerimento(r, classificador, bancosDoMes) {
  if (r.bancoAjustadoId && bancosDoMes.includes(r.bancoAjustadoId)) return r.bancoAjustadoId;
  return classificador.porProdutoModulo(r.produtoId, r.moduloId, null);
}
async function calcularEmpresaMes(repo, empresaId, mes, opcoes = {}) {
  const todos = await repo.bancos(empresaId);
  const vigentes = todos.filter((b) => b.ativo && estaVigente(b, mes)).sort((a, b) => a.ordem - b.ordem);
  const vazio = {
    empresaId,
    mes,
    bancos: [],
    transferencias: [],
    semBanco: { minutos: 0, tickets: 0 },
    alertas: []
  };
  if (vigentes.length === 0) return vazio;
  const inicioMaisAntigo = Math.min(...vigentes.map((b) => indice(inicioDoCiclo(b, mes))));
  const fechados = await repo.fechamentos(
    vigentes.map((b) => b.bancoId),
    doIndice(inicioMaisAntigo),
    mes
  );
  const fechadoEm = new Map(fechados.map((f) => [`${f.bancoId}|${chave(f.mes)}`, f]));
  const partida = /* @__PURE__ */ new Map();
  const congelados = [];
  for (const b of vigentes) {
    const doMes = opcoes.recalcularMesFechado ? void 0 : fechadoEm.get(`${b.bancoId}|${chave(mes)}`);
    if (doMes) {
      congelados.push(doMes);
      continue;
    }
    let inicio = indice(inicioDoCiclo(b, mes));
    let repasse = { horas: 0, tickets: 0 };
    for (let i = indice(mes) - 1; i >= inicio; i--) {
      const f = fechadoEm.get(`${b.bancoId}|${chave(doIndice(i))}`);
      if (f) {
        inicio = i + 1;
        repasse = { horas: f.horas?.repasse ?? 0, tickets: f.tickets?.repasse ?? 0 };
        break;
      }
    }
    partida.set(b.bancoId, { inicio, repasse });
  }
  const abertos = vigentes.filter((b) => partida.has(b.bancoId));
  if (abertos.length === 0) {
    return { ...vazio, bancos: congelados };
  }
  const primeiro = Math.min(...abertos.map((b) => partida.get(b.bancoId).inicio));
  const [dePara, reajustes, taxas] = await Promise.all([
    repo.dePara(),
    repo.reajustes(
      abertos.map((b) => b.bancoId),
      doIndice(primeiro),
      mes
    ),
    repo.taxas(empresaId)
  ]);
  const movimentos = /* @__PURE__ */ new Map();
  const movimentoDe = (bancoId, m) => {
    const k = `${bancoId}|${chave(m)}`;
    if (!movimentos.has(k)) movimentos.set(k, movimentoVazio());
    return movimentos.get(k);
  };
  let semBanco = { minutos: 0, tickets: 0 };
  for (let i = primeiro; i <= indice(mes); i++) {
    const m = doIndice(i);
    const precisam = abertos.filter((b) => partida.get(b.bancoId).inicio <= i);
    if (precisam.length === 0) continue;
    const classificador = criarClassificador(todos, dePara, m);
    const semBancoMes = { minutos: 0, tickets: 0 };
    const janelas = /* @__PURE__ */ new Map();
    for (const b of precisam) {
      const k = `${b.diaInicioApuracao}-${b.diaFimApuracao}`;
      janelas.set(k, [...janelas.get(k) ?? [], b]);
    }
    let primeiraJanela = true;
    for (const [k, bancosDaJanela] of janelas) {
      const [di, df] = k.split("-").map(Number);
      const ids = new Set(bancosDaJanela.map((b) => b.bancoId));
      for (const l of await repo.consumo(empresaId, m, di, df)) {
        const bancoId = classificador.porGrupo(l.grupo, l.itemConfiguracao);
        if (bancoId === null) {
          if (!primeiraJanela) continue;
          semBancoMes.minutos += l.minutos;
          semBancoMes.tickets += l.tickets;
        } else if (ids.has(bancoId)) {
          const mov = movimentoDe(bancoId, m);
          mov.consumo.minutos += l.minutos;
          mov.consumo.tickets += l.tickets;
        }
      }
      primeiraJanela = false;
    }
    for (const r of await repo.requerimentos(empresaId, m)) {
      const bancoId = bancoDoRequerimento(
        r,
        classificador,
        precisam.map((b) => b.bancoId)
      );
      if (bancoId === null) {
        semBancoMes.minutos += Math.round(r.horas * 60);
        semBancoMes.tickets += r.tickets;
        continue;
      }
      const mov = movimentoDe(bancoId, m);
      mov.requerimentosHoras += r.horas;
      mov.requerimentosTickets += r.tickets;
    }
    if (i === indice(mes)) semBanco = semBancoMes;
  }
  for (const r of reajustes) {
    const mov = movimentoDe(r.bancoId, { mes: r.mes, ano: r.ano });
    const destino = r.tipo === "entrada" ? mov.entrada : mov.saida;
    destino.minutos += r.minutos;
    destino.tickets += r.tickets;
  }
  const saldosDoMes = /* @__PURE__ */ new Map();
  for (const b of abertos) {
    const { inicio, repasse } = partida.get(b.bancoId);
    const repasseAnterior = { ...repasse };
    const saldos = {};
    for (let i = inicio; i <= indice(mes); i++) {
      const m = doIndice(i);
      const mov = movimentos.get(`${b.bancoId}|${chave(m)}`) ?? movimentoVazio();
      for (const u of unidadesDoContrato(b)) {
        const saldo = calcularSaldo(entradaDaUnidade(b, m, mov, u), repasseAnterior[u]);
        if (i < indice(mes)) {
          repasseAnterior[u] = aplicarRegraDeSaida(
            b,
            m,
            saldo.saldo,
            percentualDoMes(b.repasses, m),
            u
          ).repasse;
        } else {
          saldos[u] = saldo;
        }
      }
    }
    saldosDoMes.set(b.bancoId, saldos);
  }
  const entreBancos = calcularConsumoEntreBancos(
    abertos.map((b) => ({
      bancoId: b.bancoId,
      nome: b.nome,
      ordem: b.ordem,
      ativo: b.ativo,
      tipoContrato: b.tipoContrato,
      periodoApuracao: b.periodoApuracao,
      fimPeriodo: ehFimDePeriodo(b, mes),
      consomeOutrosBancos: b.consomeOutrosBancos,
      saldos: Object.fromEntries(
        Object.entries(saldosDoMes.get(b.bancoId)).map(([u, s]) => [u, s.saldo])
      )
    }))
  );
  const nomes = new Map(todos.map((b) => [b.bancoId, b.nome]));
  const calculados = abertos.map((b) => {
    const percentuais = percentualDoMes(b.repasses, mes);
    const taxa = escolherTaxa(taxas, mes, b.taxaProduto);
    const taxaPorUnidade = {
      horas: taxa ? taxaHora(taxa, b.taxaTipoHora) : null,
      tickets: taxa ? taxaTicket(taxa) : null
    };
    const resultado = {
      bancoId: b.bancoId,
      nome: b.nome,
      mes,
      fechado: false,
      fimPeriodo: ehFimDePeriodo(b, mes),
      transicaoPeriodo: false,
      percentualRepasse: percentuais.mensal,
      horas: null,
      tickets: null,
      valorAFaturar: 0,
      observacoes: [],
      alertas: []
    };
    for (const u of unidadesDoContrato(b)) {
      const saldo = saldosDoMes.get(b.bancoId)[u];
      const mov = entreBancos.porBanco[b.bancoId][u];
      const saida = aplicarRegraDeSaida(b, mes, mov.saldoAposConsumoEntreBancos, percentuais, u);
      const valor = valorExcedente(saida.excedente, u, taxaPorUnidade[u]);
      resultado.transicaoPeriodo = saida.transicaoPeriodo;
      resultado[u] = {
        ...saldo,
        consumidoDeOutros: mov.consumidoDeOutros,
        cedidoAOutros: mov.cedidoAOutros,
        saldoFinal: mov.saldoAposConsumoEntreBancos,
        repasse: saida.repasse,
        excedente: saida.excedente,
        valorExcedente: valor,
        taxa: taxaPorUnidade[u]
      };
      if (saida.excedente > 0) {
        if (taxaPorUnidade[u] === null) {
          if (!resultado.alertas.includes(ALERTA_SEM_TAXA)) resultado.alertas.push(ALERTA_SEM_TAXA);
        } else {
          resultado.observacoes.push({
            origem: "faturamento",
            texto: descricaoFaturamento(saida.excedente, u, mes, valor)
          });
        }
      }
      resultado.valorAFaturar = Math.round((resultado.valorAFaturar + valor) * 100) / 100;
    }
    for (const t of entreBancos.transferencias) {
      if (t.consumidorId !== b.bancoId && t.cedenteId !== b.bancoId) continue;
      const textos = observacoesDaTransferencia(t, {
        cedente: nomes.get(t.cedenteId),
        consumidor: nomes.get(t.consumidorId)
      });
      resultado.observacoes.unshift({
        origem: "consumo_entre_bancos",
        texto: t.consumidorId === b.bancoId ? textos.consumidor : textos.cedente
      });
    }
    return resultado;
  });
  const alertas = [];
  if (semBanco.minutos > 0 || semBanco.tickets > 0) {
    alertas.push(
      "H\xE1 consumo sem banco no m\xEAs: a empresa n\xE3o tem Banco padr\xE3o vigente para receber o que n\xE3o se encaixa nos outros bancos."
    );
  }
  const bancos = [...congelados, ...calculados].sort(
    (a, b) => vigentes.findIndex((v) => v.bancoId === a.bancoId) - vigentes.findIndex((v) => v.bancoId === b.bancoId)
  );
  return { empresaId, mes, bancos, transferencias: entreBancos.transferencias, semBanco, alertas };
}

// src/services/bancosHoras/fechamento.ts
var unidadeParaPayload = (u) => u && {
  baseline: u.baseline,
  repasse_anterior: u.repasseAnterior,
  saldo_a_utilizar: u.saldoAUtilizar,
  consumo: u.consumo,
  requerimentos: u.requerimentos,
  reajustes: u.reajustes,
  consumo_total: u.consumoTotal,
  saldo: u.saldo,
  consumido_outros: u.consumidoDeOutros,
  cedido_outros: u.cedidoAOutros,
  saldo_final: u.saldoFinal,
  repasse: u.repasse,
  excedente: u.excedente
};
function parametrosDoBanco(b, mes) {
  return {
    tipo_contrato: b.tipoContrato,
    periodo_apuracao: b.periodoApuracao,
    inicio_vigencia: `${b.inicioVigencia.ano}-${String(b.inicioVigencia.mes).padStart(2, "0")}-01`,
    dia_inicio_apuracao: b.diaInicioApuracao,
    dia_fim_apuracao: b.diaFimApuracao,
    taxa_produto: b.taxaProduto,
    taxa_tipo_hora: b.taxaTipoHora,
    repasse_especial: b.repasseEspecial,
    duracao_periodo_meses: b.duracaoPeriodoMeses,
    periodos_ate_zerar: b.periodosAteZerar,
    consome_outros_bancos: b.consomeOutrosBancos,
    visivel_cliente: b.visivelCliente,
    padrao: b.padrao,
    ordem: b.ordem,
    escopo: b.escopo,
    filtro_ic: b.filtroIc,
    baseline: baselineDoMes(b.baselines, mes),
    percentuais: percentualDoMes(b.repasses, mes)
  };
}
async function itensDeConsumoPorBanco(repo, empresaId, mes, cadastros, classificador, bancosDoMes) {
  const itens = new Map(bancosDoMes.map((id) => [id, []]));
  const janelas = new Set(
    bancosDoMes.map(
      (id) => `${cadastros.get(id).diaInicioApuracao}-${cadastros.get(id).diaFimApuracao}`
    )
  );
  for (const janela of janelas) {
    const [di, df] = janela.split("-").map(Number);
    for (const item of await repo.consumoItens(empresaId, mes, di, df)) {
      const bancoId = classificador.porGrupo(item.grupo, item.itemConfiguracao);
      const b = bancoId && cadastros.get(bancoId);
      if (!b || `${b.diaInicioApuracao}-${b.diaFimApuracao}` !== janela || !itens.has(bancoId))
        continue;
      itens.get(bancoId).push(item);
    }
  }
  return itens;
}
async function montarFechamento(repo, empresaId, mes, motivo) {
  const resultado = await calcularEmpresaMes(repo, empresaId, mes, {
    recalcularMesFechado: motivo !== "geracao_book"
  });
  if (resultado.bancos.length > 0 && resultado.bancos.every((b) => b.fechado)) {
    return null;
  }
  const cadastros = new Map((await repo.bancos(empresaId)).map((b) => [b.bancoId, b]));
  const bancosDoMes = resultado.bancos.map((b) => b.bancoId);
  const classificador = criarClassificador([...cadastros.values()], await repo.dePara(), mes);
  const consumo = await itensDeConsumoPorBanco(
    repo,
    empresaId,
    mes,
    cadastros,
    classificador,
    bancosDoMes
  );
  const itens = new Map(
    bancosDoMes.map((id) => [
      id,
      consumo.get(id).map((item) => ({
        tipo: item.fonte,
        item_id: item.itemId,
        minutos: item.minutos,
        tickets: item.tickets
      }))
    ])
  );
  for (const r of await repo.requerimentos(empresaId, mes)) {
    const bancoId = bancoDoRequerimento(r, classificador, bancosDoMes);
    if (bancoId && itens.has(bancoId)) {
      itens.get(bancoId).push({
        tipo: "requerimento",
        item_id: r.requerimentoId,
        minutos: Math.round(r.horas * 60),
        tickets: r.tickets
      });
    }
  }
  for (const r of await repo.reajustes(bancosDoMes, mes, mes)) {
    if (r.id && itens.has(r.bancoId)) {
      itens.get(r.bancoId).push({ tipo: "reajuste", item_id: r.id, minutos: r.minutos, tickets: r.tickets });
    }
  }
  for (const b of resultado.bancos) {
    const doBanco = itens.get(b.bancoId);
    const soma = (tipo, campo) => doBanco.filter((i) => i.tipo === tipo).reduce((s, i) => s + i[campo], 0);
    const horasNaoBatem = b.horas && cadastros.get(b.bancoId).tipoContrato !== "ambos" && soma("apontamento", "minutos") !== b.horas.consumo;
    const ticketsNaoBatem = b.tickets && soma("ticket", "tickets") !== b.tickets.consumo;
    if (horasNaoBatem || ticketsNaoBatem) {
      throw new Error(
        `Os itens do fechamento n\xE3o batem com o consumo calculado do banco "${b.nome}". Tente de novo.`
      );
    }
  }
  return {
    empresa_id: empresaId,
    ano: mes.ano,
    mes: mes.mes,
    motivo,
    bancos: resultado.bancos.map((b) => ({
      banco_id: b.bancoId,
      nome_banco: b.nome,
      fim_periodo: b.fimPeriodo,
      transicao_periodo: b.transicaoPeriodo,
      percentual_repasse: b.percentualRepasse,
      taxa_hora: b.horas?.taxa ?? null,
      taxa_ticket: b.tickets?.taxa ?? null,
      valor_excedente_horas: b.horas?.valorExcedente ?? 0,
      valor_excedente_tickets: b.tickets?.valorExcedente ?? 0,
      valor_a_faturar: b.valorAFaturar,
      alertas: b.alertas,
      parametros: parametrosDoBanco(cadastros.get(b.bancoId), mes),
      horas: unidadeParaPayload(b.horas),
      tickets: unidadeParaPayload(b.tickets),
      observacoes: b.observacoes,
      itens: itens.get(b.bancoId)
    })),
    transferencias: resultado.transferencias.map((t) => ({
      cedente_id: t.cedenteId,
      consumidor_id: t.consumidorId,
      unidade: t.unidade,
      quantidade: t.quantidade
    }))
  };
}
async function fecharMes(repo, empresaId, mes, motivo) {
  const payload = await montarFechamento(repo, empresaId, mes, motivo);
  if (!payload) return { acao: "existente", fechamentos: [] };
  return repo.gravarFechamento(payload);
}

// src/services/bancosHoras/comparacao.ts
var MOTIVOS_EXPLICADOS = /* @__PURE__ */ new Set([
  "acima_24h",
  "fuso",
  "depois_do_fechamento",
  "removido_do_aranda",
  "organizacao_so_no_novo",
  "organizacao_curinga",
  "codigo_trocado",
  "regra_do_legado",
  "lancado_depois_do_mes"
]);
var MUDANCAS_CODIGOS_LEGADO = [
  {
    em: "2026-06-21",
    passouAContar: [
      "Nota Publicada (Banco=S| SLA=N)",
      "Parametriza\xE7\xE3o / Funcionalidade (Banco=S |SLA=S)"
    ],
    deixouDeContar: []
  },
  { em: "2026-06-29", passouAContar: ["Aloca\xE7\xE3o T&M"], deixouDeContar: [] },
  {
    em: "2026-07-02",
    passouAContar: ["Monitoramento DBA (Banco=S |SLA=N)"],
    deixouDeContar: ["Monitoramento DBA (Banco=S |SLA=S)"]
  },
  {
    em: "2026-07-10",
    passouAContar: ["Parametriza\xE7\xE3o / Funcionalidade (Banco=S| SLA=N)"],
    deixouDeContar: ["Parametriza\xE7\xE3o / Funcionalidade (Banco=S |SLA=S)"]
  },
  {
    em: "2026-08-01",
    passouAContar: ["Aloca\xE7\xE3o", "Aloca\xE7\xE3o (Banco=S |SLA=N)", "Aloca\xE7\xE3o (Banco=S| SLA=N)"],
    deixouDeContar: []
  },
  {
    em: "2026-09-22",
    passouAContar: ["Aloca\xE7\xE3o - T&M Banco de Horas (Banco=S |SLA=N)"],
    deixouDeContar: ["Aloca\xE7\xE3o - T&M (Banco=S |SLA=N)"]
  }
];
var INTERVALO = /^(?:([+-]?\d+)\s+days?)?\s*(?:([+-])?(\d+):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/;
function minutosDoIntervalo(texto) {
  const t = (texto ?? "").trim();
  if (!t) return 0;
  const m = INTERVALO.exec(t);
  if (!m) throw new Error(`Intervalo inv\xE1lido: "${t}"`);
  const [, dias, sinal, horas, minutos] = m;
  const tempo = horas ? (Number(horas) * 60 + Number(minutos)) * (sinal === "-" ? -1 : 1) : 0;
  return (dias ? Number(dias) * 1440 : 0) + tempo;
}
var numero = (v) => v === null || v === void 0 || v === "" ? 0 : Number(v);
function medidasDoLegado(snapshot) {
  const h = (campo) => minutosDoIntervalo(snapshot[campo]);
  const t = (campo) => numero(snapshot[campo]);
  return {
    horas: {
      consumo: h("consumo_horas"),
      requerimentos: h("requerimentos_horas"),
      reajustes: h("reajustes_horas"),
      saldo: h("saldo_horas"),
      repasse: h("repasse_horas"),
      excedente: h("excedentes_horas")
    },
    tickets: {
      consumo: t("consumo_tickets"),
      requerimentos: t("requerimentos_tickets"),
      reajustes: t("reajustes_tickets"),
      saldo: t("saldo_tickets"),
      repasse: t("repasse_tickets"),
      excedente: t("excedentes_tickets")
    },
    valorAFaturar: numero(snapshot.valor_a_faturar)
  };
}
var UNIDADES2 = ["horas", "tickets"];
var MEDIDAS = [
  "consumo",
  "requerimentos",
  "reajustes",
  "saldo",
  "repasse",
  "excedente"
];
var MEDIDAS_BASE = ["consumo", "requerimentos", "reajustes"];
var medidasVazias = () => ({
  consumo: 0,
  requerimentos: 0,
  reajustes: 0,
  saldo: 0,
  repasse: 0,
  excedente: 0
});
function medidasDoNovo(bancos) {
  const total = { horas: medidasVazias(), tickets: medidasVazias(), valorAFaturar: 0 };
  for (const b of bancos) {
    for (const u of UNIDADES2) {
      const r = b[u];
      if (!r) continue;
      for (const medida of MEDIDAS) total[u][medida] += r[medida];
    }
    total.valorAFaturar += b.valorAFaturar;
  }
  const usadas = UNIDADES2.filter((u) => bancos.some((b) => b[u]));
  return {
    total,
    porBanco: bancos.map((b) => ({
      bancoId: b.bancoId,
      nome: b.nome,
      minutos: b.horas?.consumo ?? 0,
      tickets: b.tickets?.consumo ?? 0
    })),
    unidades: usadas.length > 0 ? usadas : UNIDADES2,
    bancos: bancos.length
  };
}
var FUSO = "America/Sao_Paulo";
function mesDaData(iso, timeZone) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric"
  }).formatToParts(new Date(iso));
  const valor = (tipo) => Number(partes.find((p) => p.type === tipo)?.value);
  return { mes: valor("month"), ano: valor("year") };
}
var mesmoMes = (a, b) => a.mes === b.mes && a.ano === b.ano;
var normalizar2 = (texto) => (texto ?? "").trim().toUpperCase();
function casaComoIlike(texto, padrao) {
  const regex = padrao.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${regex}$`, "i").test(texto.trim());
}
var depoisDoFechamento = (data, ctx) => !!ctx.fechadoEm && !!data && data > ctx.fechadoEm;
var regraDoLegadoMudou = (codigo, lista, ctx) => !!codigo && MUDANCAS_CODIGOS_LEGADO.some((m) => m[lista].includes(codigo) && depoisDoFechamento(m.em, ctx));
var indiceMes = (m) => m.ano * 12 + m.mes;
function lancadoDepoisDoMes(d) {
  if (!d.data || !d.lancadoEm) return false;
  return indiceMes(mesDaData(d.lancadoEm, FUSO)) > indiceMes(mesDaData(d.data, FUSO));
}
function motivoSoNoNovo(d, ctx) {
  if (d.data) {
    if (mesmoMes(mesDaData(d.data, FUSO), ctx.mes) && !mesmoMes(mesDaData(d.data, "UTC"), ctx.mes))
      return "fuso";
  }
  if (depoisDoFechamento(d.sincronizadoEm, ctx)) return "depois_do_fechamento";
  if (depoisDoFechamento(d.codigoTrocadoEm, ctx)) return "codigo_trocado";
  if (regraDoLegadoMudou(d.codigoResolucao, "passouAContar", ctx)) return "regra_do_legado";
  if (lancadoDepoisDoMes(d)) return "lancado_depois_do_mes";
  const organizacao = normalizar2(d.organizacao);
  if (organizacao && !casaComoIlike(organizacao, ctx.nomeLegado) && ctx.organizacoesNovas.some((o) => normalizar2(o) === organizacao))
    return "organizacao_so_no_novo";
  return "sem_motivo";
}
function motivoSoNoLegado(chave2, d, ctx) {
  if (!d) return "removido_do_aranda";
  if (d.data) {
    if (mesmoMes(mesDaData(d.data, "UTC"), ctx.mes) && !mesmoMes(mesDaData(d.data, FUSO), ctx.mes))
      return "fuso";
  }
  const organizacao = normalizar2(d.organizacao);
  if (!ctx.organizacoesNovas.some((o) => normalizar2(o) === organizacao)) {
    const curinga = /[_%]/.test(ctx.nomeLegado) && casaComoIlike(organizacao, ctx.nomeLegado);
    return curinga ? "organizacao_curinga" : "organizacao_fora_do_cadastro";
  }
  if (depoisDoFechamento(d.codigoTrocadoEm, ctx)) return "codigo_trocado";
  if (!ctx.codigoConta(d.codigoResolucao, d.fonte)) {
    return regraDoLegadoMudou(d.codigoResolucao, "deixouDeContar", ctx) ? "regra_do_legado" : "codigo_sem_regra";
  }
  if (ctx.semBanco.has(chave2)) return "fora_do_escopo";
  return "sem_motivo";
}
function diferencasDosItens(legado, novo, dados, ctx) {
  const doLegado = new Map(legado.map((i) => [i.chave, i]));
  const doNovo = new Map(novo.map((i) => [i.chave, i]));
  const chaves = [.../* @__PURE__ */ new Set([...doLegado.keys(), ...doNovo.keys()])];
  const diferencas = [];
  for (const chave2 of chaves) {
    const l = doLegado.get(chave2);
    const n = doNovo.get(chave2);
    if (l && n && l.minutos === n.minutos && l.tickets === n.tickets) continue;
    const d = dados.get(chave2);
    let motivo;
    if (l && n) {
      motivo = n.minutos >= 1440 && l.minutos === n.minutos % 1440 ? "acima_24h" : "sem_motivo";
    } else if (n) {
      motivo = d ? motivoSoNoNovo(d, ctx) : "sem_motivo";
    } else {
      motivo = motivoSoNoLegado(chave2, d, ctx);
    }
    const fonte = (l ?? n).fonte;
    const ticket = fonte === "ticket";
    diferencas.push({
      chave: chave2,
      fonte,
      chamado: d?.chamado ?? null,
      data: d?.data ?? null,
      grupo: d?.grupo ?? null,
      minutosLegado: !ticket && l ? l.minutos : null,
      minutosNovo: !ticket && n ? n.minutos : null,
      ticketsLegado: ticket && l ? l.tickets : null,
      ticketsNovo: ticket && n ? n.tickets : null,
      motivo,
      explicado: MOTIVOS_EXPLICADOS.has(motivo)
    });
  }
  return diferencas.sort((a, b) => {
    if (a.data !== b.data) {
      if (a.data === null) return 1;
      if (b.data === null) return -1;
      return a.data < b.data ? -1 : 1;
    }
    return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
  });
}
var PESO = { igual: 0, explicada: 1, divergente: 2 };
var pior = (...s) => s.reduce((a, b) => PESO[b] > PESO[a] ? b : a, "igual");
function consumoExplicado(unidade, diferenca, itens) {
  const fonte = unidade === "horas" ? "apontamento" : "ticket";
  const daUnidade = itens.filter((i) => i.fonte === fonte);
  const soma = daUnidade.reduce(
    (s, i) => unidade === "horas" ? s + (i.minutosNovo ?? 0) - (i.minutosLegado ?? 0) : s + (i.ticketsNovo ?? 0) - (i.ticketsLegado ?? 0),
    0
  );
  return daUnidade.length > 0 && daUnidade.every((i) => i.explicado) && soma === diferenca;
}
function compararMes(e) {
  const diferencas = [];
  let base = "igual";
  let saldoDifere = false;
  for (const unidade of e.unidades) {
    for (const medida of MEDIDAS) {
      const legado = e.legado[unidade][medida];
      const novo = e.novo[unidade][medida];
      if (legado === novo) continue;
      const deSaldo = !MEDIDAS_BASE.includes(medida);
      if (deSaldo && !e.umBanco) continue;
      diferencas.push({ unidade, medida, legado, novo });
      if (deSaldo) saldoDifere = true;
      else if (medida === "consumo" && consumoExplicado(unidade, novo - legado, e.itens))
        base = pior(base, "explicada");
      else if (medida === "reajustes" && novo - legado === (e.reajustesDepois?.[unidade] ?? 0))
        base = pior(base, "explicada");
      else base = "divergente";
    }
  }
  if (!saldoDifere) return { situacao: base, diferencas, origem: null };
  const causa = base !== "igual" ? pior(base, e.herdada ?? "igual") : e.herdada ?? "divergente";
  return { situacao: pior(base, causa), diferencas, origem: causa };
}
var indice2 = (m) => m.ano * 12 + m.mes;
function compararEmpresa(entradas) {
  const ordenadas = [...entradas].sort((a, b) => indice2(a.mes) - indice2(b.mes));
  const meses = [];
  let herdada = null;
  let origemMes = null;
  for (const e of ordenadas) {
    const r = compararMes({ ...e, umBanco: e.bancos <= 1, herdada });
    if (r.origem === null) origemMes = null;
    else if (herdada === null) origemMes = e.mes;
    herdada = r.origem;
    meses.push({ ...e, ...r, origemSaldo: origemMes });
  }
  const geral = pior(...meses.map((m) => m.situacao));
  const umBanco = ordenadas.every((e) => e.bancos <= 1);
  const soma = (f) => ordenadas.reduce((s, e) => s + f(e), 0);
  return {
    situacao: geral === "igual" ? umBanco ? "identico" : "soma_confere" : geral,
    mesesComparados: ordenadas.length,
    meses,
    consumo: {
      legadoMinutos: soma((e) => e.legado.horas.consumo),
      novoMinutos: soma((e) => e.novo.horas.consumo),
      legadoTickets: soma((e) => e.legado.tickets.consumo),
      novoTickets: soma((e) => e.novo.tickets.consumo)
    }
  };
}

// src/services/bancosHoras/sombra.ts
var MAX_ITENS_POR_MES = 500;
var indice3 = (m) => m.ano * 12 + (m.mes - 1);
var doIndice2 = (i) => ({ mes: i % 12 + 1, ano: Math.floor(i / 12) });
var chaveMes = (m) => `${m.ano}-${m.mes}`;
var UNIDADE_DA_FONTE = {
  apontamento: "horas",
  ticket: "tickets"
};
async function fecharEmSombra({ motor, sombra }, empresaId, legado, fecharDesde, de, ate) {
  const aFechar = legado.filter((f) => f.fechadoEm >= fecharDesde);
  if (aFechar.length === 0) return 0;
  if (!(await motor.bancos(empresaId)).some((b) => b.ativo)) return 0;
  const novoEm = /* @__PURE__ */ new Map();
  for (const f of await sombra.fechamentosNovos(empresaId, de, ate)) {
    const atual = novoEm.get(chaveMes(f.mes));
    if (!atual || f.fechadoEm < atual) novoEm.set(chaveMes(f.mes), f.fechadoEm);
  }
  let fechados = 0;
  for (const f of [...aFechar].sort((a, b) => indice3(a.mes) - indice3(b.mes))) {
    const novo = novoEm.get(chaveMes(f.mes));
    if (novo && novo >= f.fechadoEm) continue;
    await fecharMes(motor, empresaId, f.mes, novo ? "retificacao" : "geracao_book");
    fechados++;
  }
  return fechados;
}
async function itensDoMes({ sombra }, motor, empresa, f, bancosDoMes, fechado, contexto) {
  const doLegado = await sombra.itensDoLegado(f.apontamentosIds, f.ticketsIds);
  const encontrados = new Set(doLegado.map((d) => `${d.fonte}:${d.idLegado}`));
  const legado = doLegado.map((d) => ({
    chave: d.chave,
    fonte: d.fonte,
    minutos: d.fonte === "apontamento" ? d.minutosTexto : 0,
    tickets: d.fonte === "ticket" ? 1 : 0
  }));
  for (const [fonte, ids] of [
    ["apontamento", f.apontamentosIds],
    ["ticket", f.ticketsIds]
  ]) {
    for (const id of ids) {
      if (!encontrados.has(`${fonte}:${id}`)) {
        legado.push({
          chave: `legado:${id}`,
          fonte,
          minutos: 0,
          tickets: fonte === "ticket" ? 1 : 0
        });
      }
    }
  }
  let novo;
  const semBanco = /* @__PURE__ */ new Set();
  if (fechado) {
    novo = await sombra.itensFechados(empresa.id, f.mes);
  } else {
    const cadastros = await motor.bancos(empresa.id);
    const classificador = criarClassificador(cadastros, await motor.dePara(), f.mes);
    const porBanco = await itensDeConsumoPorBanco(
      motor,
      empresa.id,
      f.mes,
      new Map(cadastros.map((b) => [b.bancoId, b])),
      classificador,
      bancosDoMes
    );
    novo = [...porBanco.values()].flat().map((i) => ({
      chave: i.itemId,
      fonte: i.fonte,
      minutos: i.minutos,
      tickets: i.tickets
    }));
    const nosBancos = new Set(novo.map((i) => i.chave));
    const janelas = new Set(
      cadastros.filter((b) => b.ativo && estaVigente(b, f.mes)).map((b) => `${b.diaInicioApuracao}-${b.diaFimApuracao}`)
    );
    if (janelas.size === 0) janelas.add("1-0");
    for (const janela of janelas) {
      const [di, df] = janela.split("-").map(Number);
      for (const i of await motor.consumoItens(empresa.id, f.mes, di, df)) {
        if (!nosBancos.has(i.itemId)) semBanco.add(i.itemId);
      }
    }
  }
  const dados = new Map(doLegado.map((d) => [d.chave, d]));
  const faltam = novo.filter((i) => !dados.has(i.chave));
  if (faltam.length > 0) {
    const buscados = await sombra.dadosDosItens({
      apontamentos: faltam.filter((i) => i.fonte === "apontamento").map((i) => i.chave),
      tickets: faltam.filter((i) => i.fonte === "ticket").map((i) => i.chave)
    });
    for (const d of buscados) dados.set(d.chave, d);
  }
  const doNovo = new Set(novo.map((i) => i.chave));
  const doLado = new Set(legado.map((i) => i.chave));
  const chamados = [
    ...new Set(
      [...dados.values()].filter((d) => d.chamado && doNovo.has(d.chave) !== doLado.has(d.chave)).map((d) => d.chamado)
    )
  ];
  if (chamados.length > 0) {
    const trocas = await sombra.trocasDeCodigo(chamados);
    for (const [k, d] of dados) {
      const em = d.chamado ? trocas.get(d.chamado) : void 0;
      if (em) dados.set(k, { ...d, codigoTrocadoEm: em });
    }
  }
  return diferencasDosItens(legado, novo, dados, {
    mes: f.mes,
    fechadoEm: f.fechadoEm,
    nomeLegado: empresa.nomeLegado,
    organizacoesNovas: contexto.organizacoes,
    codigoConta: contexto.codigoConta,
    semBanco
  });
}
async function processarEmpresa(deps, empresa, opcoes) {
  const { sombra } = deps;
  const de = doIndice2(indice3(opcoes.hoje) - 12);
  const ate = doIndice2(indice3(opcoes.hoje) - 1);
  const legado = (await sombra.fechamentosLegado(empresa.id, de, ate)).sort(
    (a, b) => indice3(a.mes) - indice3(b.mes)
  );
  const fechamentos = opcoes.fecharDesde ? await fecharEmSombra(deps, empresa.id, legado, opcoes.fecharDesde, de, ate) : 0;
  if (opcoes.somenteFechamento) return { fechamentos, situacao: null };
  if (legado.length === 0) {
    await sombra.gravar({ empresa_id: empresa.id, meses: [] });
    return { fechamentos, situacao: null };
  }
  const motor = comCache(deps.motor);
  const [organizacoes, codigos] = await Promise.all([
    sombra.organizacoes(empresa.id),
    sombra.codigos()
  ]);
  const regra = new Map(codigos.map((c) => [c.codigo, c]));
  const codigoConta = (codigo, fonte) => {
    const c = codigo === null ? void 0 : regra.get(codigo);
    return !!c && (fonte === "apontamento" ? c.contaHoras : c.contaTickets);
  };
  const entradas = [];
  const porBancoDoMes = /* @__PURE__ */ new Map();
  for (const f of legado) {
    const resultado = await calcularEmpresaMes(motor, empresa.id, f.mes);
    const novo = medidasDoNovo(resultado.bancos);
    const medidasLegado = medidasDoLegado(f.snapshot);
    porBancoDoMes.set(chaveMes(f.mes), novo.porBanco);
    const consumoDifere = novo.unidades.some(
      (u) => medidasLegado[u].consumo !== novo.total[u].consumo
    );
    const fechado = resultado.bancos.length > 0 && resultado.bancos.every((b) => b.fechado);
    const itens = consumoDifere ? (await itensDoMes(
      deps,
      motor,
      empresa,
      f,
      resultado.bancos.map((b) => b.bancoId),
      fechado,
      { organizacoes, codigoConta }
    )).filter((i) => novo.unidades.includes(UNIDADE_DA_FONTE[i.fonte])) : [];
    const reajustesDiferem = novo.unidades.some(
      (u) => medidasLegado[u].reajustes !== novo.total[u].reajustes
    );
    const reajustesDepois = reajustesDiferem ? await sombra.reajustesDepoisDoFechamento(empresa.id, f.mes, f.fechadoEm) : void 0;
    entradas.push({
      mes: f.mes,
      legado: medidasLegado,
      novo: novo.total,
      unidades: novo.unidades,
      bancos: novo.bancos,
      itens,
      reajustesDepois
    });
  }
  const r = compararEmpresa(entradas);
  const fechadoEm = new Map(legado.map((f) => [chaveMes(f.mes), f.fechadoEm]));
  await sombra.gravar({
    empresa_id: empresa.id,
    situacao: r.situacao,
    meses_comparados: r.mesesComparados,
    consumo_legado_minutos: r.consumo.legadoMinutos,
    consumo_novo_minutos: r.consumo.novoMinutos,
    consumo_legado_tickets: r.consumo.legadoTickets,
    consumo_novo_tickets: r.consumo.novoTickets,
    meses: r.meses.map((m) => ({
      ano: m.mes.ano,
      mes: m.mes.mes,
      situacao: m.situacao,
      legado: m.legado,
      novo: { ...m.novo, porBanco: porBancoDoMes.get(chaveMes(m.mes)) ?? [] },
      origem_saldo: m.origemSaldo,
      itens: m.itens.slice(0, MAX_ITENS_POR_MES),
      itens_total: m.itens.length,
      fechamento_legado_em: fechadoEm.get(chaveMes(m.mes))
    }))
  });
  return { fechamentos, situacao: r.situacao };
}
async function executarModoSombra(deps, opcoes) {
  const todas = await deps.sombra.empresasEmLegado();
  const empresas = opcoes.empresaId ? todas.filter((e) => e.id === opcoes.empresaId) : todas;
  const resumo = {
    empresas: empresas.length,
    comparadas: 0,
    removidas: 0,
    fechamentos: 0,
    erros: 0
  };
  for (const empresa of empresas) {
    try {
      const r = await processarEmpresa(
        { motor: deps.motor(), sombra: deps.sombra },
        empresa,
        opcoes
      );
      resumo.fechamentos += r.fechamentos;
      if (opcoes.somenteFechamento) continue;
      if (r.situacao) resumo.comparadas++;
      else resumo.removidas++;
    } catch (e) {
      resumo.erros++;
      await deps.sombra.registrarErro(empresa.id, e instanceof Error ? e.message : String(e));
    }
  }
  return resumo;
}

// src/services/bancosHoras/repositorioSupabase.ts
var numero2 = (v) => v === null || v === void 0 ? null : Number(v);
var mesAno = (data) => ({
  ano: Number(data.slice(0, 4)),
  mes: Number(data.slice(5, 7))
});
var indice4 = (m) => m.ano * 12 + (m.mes - 1);
var OBSERVACOES_AUTOMATICAS = ["consumo_entre_bancos", "faturamento"];
async function consultar(promessa, origem) {
  const { data, error } = await promessa;
  if (error) throw new Error(`Falha ao ler ${origem}: ${error.message}`);
  return data ?? [];
}
function unidadeDoFechamento(f, sufixo) {
  if (f[`baseline_${sufixo}`] === null || f[`baseline_${sufixo}`] === void 0) return null;
  const v = (campo) => numero2(f[`${campo}_${sufixo}`]) ?? 0;
  const horas = sufixo === "minutos";
  return {
    baseline: v("baseline"),
    repasseAnterior: v("repasse_anterior"),
    saldoAUtilizar: v("saldo_a_utilizar"),
    consumo: v("consumo"),
    requerimentos: v("requerimentos"),
    reajustes: v("reajustes"),
    consumoTotal: v("consumo_total"),
    saldo: v("saldo"),
    consumidoDeOutros: v("consumido_outros"),
    cedidoAOutros: v("cedido_outros"),
    saldoFinal: v("saldo_final"),
    repasse: v("repasse"),
    excedente: v("excedente"),
    valorExcedente: numero2(horas ? f.valor_excedente_horas : f.valor_excedente_tickets) ?? 0,
    taxa: numero2(horas ? f.taxa_hora : f.taxa_ticket)
  };
}
function criarRepositorioSupabase(cliente) {
  return {
    async bancos(empresaId) {
      const bancos = await consultar(
        cliente.from("bancos_horas").select("*").eq("empresa_id", empresaId).order("ordem"),
        "bancos de horas"
      );
      if (bancos.length === 0) return [];
      const ids = bancos.map((b) => b.id);
      const [escopos, baselines, repasses] = await Promise.all([
        consultar(
          cliente.from("bancos_horas_escopo").select("*").in("banco_id", ids),
          "escopo dos bancos"
        ),
        consultar(
          cliente.from("bancos_horas_baseline").select("*").in("banco_id", ids),
          "baselines"
        ),
        consultar(
          cliente.from("bancos_horas_repasse").select("*").in("banco_id", ids),
          "percentuais de repasse"
        )
      ]);
      return bancos.map((b) => ({
        bancoId: b.id,
        nome: b.nome,
        ordem: b.ordem,
        padrao: b.padrao,
        ativo: b.ativo,
        visivelCliente: b.visivel_cliente,
        tipoContrato: b.tipo_contrato,
        periodoApuracao: b.periodo_apuracao,
        inicioVigencia: mesAno(b.inicio_vigencia),
        fimVigencia: b.fim_vigencia ? mesAno(b.fim_vigencia) : null,
        diaInicioApuracao: b.dia_inicio_apuracao,
        diaFimApuracao: b.dia_fim_apuracao,
        taxaProduto: b.taxa_produto,
        taxaTipoHora: b.taxa_tipo_hora,
        repasseEspecial: b.repasse_especial,
        duracaoPeriodoMeses: b.duracao_periodo_meses,
        periodosAteZerar: b.periodos_ate_zerar,
        consomeOutrosBancos: b.consome_outros_bancos,
        escopo: escopos.filter((e) => e.banco_id === b.id).map((e) => ({ produtoId: e.produto_id, moduloId: e.modulo_id })),
        filtroIc: b.filtro_ic_operador ? { operador: b.filtro_ic_operador, valor: b.filtro_ic_valor } : null,
        baselines: baselines.filter((v) => v.banco_id === b.id).map((v) => ({
          dataInicio: v.data_inicio,
          dataFim: v.data_fim,
          baselineMinutos: numero2(v.baseline_minutos),
          baselineTickets: numero2(v.baseline_tickets),
          credito: v.credito
        })),
        repasses: repasses.filter((v) => v.banco_id === b.id).map((v) => ({
          dataInicio: v.data_inicio,
          dataFim: v.data_fim,
          percentualMensal: numero2(v.percentual_mensal),
          percentualDentroPeriodo: numero2(v.percentual_dentro_periodo),
          percentualEntrePeriodos: numero2(v.percentual_entre_periodos)
        }))
      }));
    },
    async dePara() {
      const grupos = await consultar(
        cliente.from("grupos_aranda").select("*"),
        "de-para dos grupos"
      );
      return grupos.map((g) => ({
        grupoAranda: g.grupo_aranda,
        produtoId: g.produto_id,
        moduloId: g.modulo_id,
        ativo: g.ativo
      }));
    },
    async consumo(empresaId, m, diaInicio, diaFim) {
      const linhas = await consultar(
        cliente.rpc("bancos_horas_consumo", {
          p_empresa_id: empresaId,
          p_ano: m.ano,
          p_mes: m.mes,
          p_dia_inicio: diaInicio,
          p_dia_fim: diaFim
        }),
        "bancos_horas_consumo"
      );
      return linhas.map((l) => ({
        fonte: l.fonte,
        grupo: l.grupo,
        itemConfiguracao: l.item_configuracao,
        minutos: numero2(l.minutos) ?? 0,
        tickets: numero2(l.tickets) ?? 0
      }));
    },
    async consumoItens(empresaId, m, diaInicio, diaFim) {
      const linhas = await consultar(
        cliente.rpc("bancos_horas_consumo_itens", {
          p_empresa_id: empresaId,
          p_ano: m.ano,
          p_mes: m.mes,
          p_dia_inicio: diaInicio,
          p_dia_fim: diaFim
        }),
        "bancos_horas_consumo_itens"
      );
      return linhas.map((l) => ({
        itemId: l.item_id,
        fonte: l.fonte,
        grupo: l.grupo,
        itemConfiguracao: l.item_configuracao,
        minutos: numero2(l.minutos) ?? 0,
        tickets: numero2(l.tickets) ?? 0
      }));
    },
    async gravarFechamento(payload) {
      const { data, error } = await cliente.rpc("bancos_horas_registrar_fechamento", {
        p_fechamento: payload
      });
      if (error) throw new Error(`Falha ao gravar o fechamento: ${error.message}`);
      return data;
    },
    async requerimentos(empresaId, m) {
      const linhas = await consultar(
        cliente.rpc("bancos_horas_requerimentos", {
          p_empresa_id: empresaId,
          p_ano: m.ano,
          p_mes: m.mes
        }),
        "bancos_horas_requerimentos"
      );
      return linhas.map((r) => ({
        requerimentoId: r.requerimento_id,
        produtoId: r.produto_id,
        moduloId: r.modulo_id,
        bancoAjustadoId: r.banco_ajustado_id,
        horas: numero2(r.horas) ?? 0,
        tickets: numero2(r.tickets) ?? 0
      }));
    },
    async reajustes(bancoIds, de, ate) {
      if (bancoIds.length === 0) return [];
      const linhas = await consultar(
        cliente.from("bancos_horas_reajustes").select("*").in("banco_id", bancoIds).eq("ativo", true).gte("ano", de.ano).lte("ano", ate.ano),
        "reajustes"
      );
      return linhas.filter((r) => indice4(r) >= indice4(de) && indice4(r) <= indice4(ate)).map((r) => ({
        id: r.id,
        bancoId: r.banco_id,
        mes: r.mes,
        ano: r.ano,
        tipo: r.tipo,
        minutos: r.minutos,
        tickets: r.tickets
      }));
    },
    async fechamentos(bancoIds, de, ate) {
      if (bancoIds.length === 0) return [];
      const linhas = (await consultar(
        cliente.from("bancos_horas_fechamentos").select("*").in("banco_id", bancoIds).eq("vigente", true).gte("ano", de.ano).lte("ano", ate.ano),
        "fechamentos"
      )).filter((f) => indice4(f) >= indice4(de) && indice4(f) <= indice4(ate));
      if (linhas.length === 0) return [];
      const observacoes = await consultar(
        cliente.from("bancos_horas_observacoes").select("*").in(
          "fechamento_id",
          linhas.map((f) => f.id)
        ).eq("ativo", true),
        "observa\xE7\xF5es dos fechamentos"
      );
      return linhas.map((f) => ({
        bancoId: f.banco_id,
        nome: f.nome_banco,
        mes: { mes: f.mes, ano: f.ano },
        fechado: true,
        fimPeriodo: f.fim_periodo,
        transicaoPeriodo: f.transicao_periodo,
        percentualRepasse: numero2(f.percentual_repasse) ?? 0,
        horas: unidadeDoFechamento(f, "minutos"),
        tickets: unidadeDoFechamento(f, "tickets"),
        valorAFaturar: numero2(f.valor_a_faturar) ?? 0,
        observacoes: observacoes.filter((o) => o.fechamento_id === f.id && OBSERVACOES_AUTOMATICAS.includes(o.origem)).map((o) => ({ origem: o.origem, texto: o.texto })),
        alertas: f.alertas ?? []
      }));
    },
    async taxas(empresaId) {
      const taxas = await consultar(
        cliente.from("taxas_clientes").select("*").eq("cliente_id", empresaId),
        "taxas"
      );
      if (taxas.length === 0) return [];
      const funcoes = await consultar(
        cliente.from("valores_taxas_funcoes").select("*").in(
          "taxa_id",
          taxas.map((t) => t.id)
        ).eq("tipo_hora", "remota"),
        "valores das taxas"
      );
      return taxas.map((t) => ({
        id: t.id,
        vigenciaInicio: t.vigencia_inicio,
        tipoProduto: t.tipo_produto,
        tipoCalculoAdicional: t.tipo_calculo_adicional ?? null,
        valorTicketExcedente: numero2(t.valor_ticket_excedente),
        ticketExcedente2: numero2(t.ticket_excedente_2),
        ticketExcedente: numero2(t.ticket_excedente),
        funcoesRemotas: funcoes.filter((f) => f.taxa_id === t.id).map((f) => ({
          funcao: f.funcao,
          valorBase: numero2(f.valor_base) ?? 0,
          valorAdicional: numero2(f.valor_adicional)
        }))
      }));
    }
  };
}

// src/utils/horasUtils.ts
function converterHorasParaMinutos(horasString) {
  if (!horasString || horasString.trim() === "" || horasString === "null" || horasString === "undefined" || horasString === "NaN") {
    return 0;
  }
  const valor = horasString.trim();
  if (valor.includes(":")) {
    const isNegativo = valor.startsWith("-");
    const valorLimpo = valor.replace(/-/g, "");
    const [horasStr, minutosStr] = valorLimpo.split(":");
    const horas = parseInt(horasStr);
    const minutos = parseInt(minutosStr);
    if (isNaN(horas) || isNaN(minutos)) {
      console.warn("Convers\xE3o de HH:MM resultou em NaN:", { horasStr, minutosStr, horas, minutos });
      return 0;
    }
    if (minutos >= 60) {
      console.warn("Minutos >= 60, corrigindo:", { horas, minutos });
      const horasAdicionais = Math.floor(minutos / 60);
      const minutosRestantes = minutos % 60;
      const totalMinutos2 = (horas + horasAdicionais) * 60 + minutosRestantes;
      return isNegativo ? -totalMinutos2 : totalMinutos2;
    }
    const totalMinutos = horas * 60 + minutos;
    return isNegativo ? -totalMinutos : totalMinutos;
  }
  const horasInteiras = parseInt(valor);
  if (isNaN(horasInteiras)) {
    console.warn("Convers\xE3o de horas inteiras resultou em NaN:", valor);
    return 0;
  }
  return horasInteiras * 60;
}

// src/services/bancosHoras/repositorioSombra.ts
var LOTE = 150;
var indice5 = (m) => m.ano * 12 + (m.mes - 1);
async function consultar2(promessa, origem) {
  const { data, error } = await promessa;
  if (error) throw new Error(`Falha ao ler ${origem}: ${error.message}`);
  return data ?? [];
}
async function emLotes(ids, consulta, origem) {
  const linhas = [];
  for (let i = 0; i < ids.length; i += LOTE) {
    linhas.push(...await consultar2(consulta(ids.slice(i, i + LOTE)), origem));
  }
  return linhas;
}
var COLUNAS_FECHAMENTO_LEGADO = "mes, ano, fechado_em, snapshot_calculo, apontamentos_ids, tickets_ids";
var doFechamentoLegado = (f) => ({
  mes: { mes: f.mes, ano: f.ano },
  fechadoEm: f.fechado_em,
  snapshot: f.snapshot_calculo ?? {},
  apontamentosIds: f.apontamentos_ids ?? [],
  ticketsIds: f.tickets_ids ?? []
});
var COLUNAS_APONTAMENTO = "id, id_externo, nro_chamado, data_atividade, data_sistema, caso_grupo, org_us_final, cod_resolucao, synced_at, created_at, data_ult_modificacao_geral, tempo_gasto_horas";
var COLUNAS_TICKET = "id, nro_solicitacao, data_fechamento, nome_grupo, organizacao, cod_resolucao, synced_at, created_at";
function maisRecente(...datas) {
  let escolhida = null;
  for (const d of datas) {
    if (d && (!escolhida || Date.parse(d) > Date.parse(escolhida))) escolhida = d;
  }
  return escolhida;
}
var TRES_HORAS = 3 * 60 * 60 * 1e3;
var trocaEmUtc = (created) => new Date(Date.parse(created) + TRES_HORAS).toISOString();
var doApontamento = (a) => ({
  chave: a.id,
  idLegado: a.id_externo,
  fonte: "apontamento",
  chamado: a.nro_chamado ?? null,
  data: a.data_atividade ?? null,
  grupo: a.caso_grupo ?? null,
  organizacao: a.org_us_final ?? null,
  codigoResolucao: a.cod_resolucao ?? null,
  sincronizadoEm: maisRecente(a.synced_at, a.created_at, a.data_ult_modificacao_geral),
  lancadoEm: a.data_sistema ?? null,
  codigoTrocadoEm: null,
  // O legado lê o texto, que perde os dias inteiros acima de 24 h (A3)
  minutosTexto: converterHorasParaMinutos(a.tempo_gasto_horas ?? "")
});
var doTicket = (t) => ({
  chave: t.id,
  idLegado: t.nro_solicitacao,
  fonte: "ticket",
  chamado: t.nro_solicitacao ?? null,
  data: t.data_fechamento ?? null,
  grupo: t.nome_grupo ?? null,
  organizacao: t.organizacao ?? null,
  codigoResolucao: t.cod_resolucao ?? null,
  sincronizadoEm: maisRecente(t.synced_at, t.created_at),
  lancadoEm: null,
  codigoTrocadoEm: null,
  minutosTexto: 0
});
var semIdLegado = (d) => ({
  chave: d.chave,
  fonte: d.fonte,
  chamado: d.chamado,
  data: d.data,
  grupo: d.grupo,
  organizacao: d.organizacao,
  codigoResolucao: d.codigoResolucao,
  sincronizadoEm: d.sincronizadoEm,
  lancadoEm: d.lancadoEm,
  codigoTrocadoEm: d.codigoTrocadoEm,
  minutosTexto: d.minutosTexto
});
function criarRepositorioSombra(cliente) {
  async function fechamentosVigentes(empresaId, de, ate) {
    const bancos = await consultar2(
      cliente.from("bancos_horas").select("id").eq("empresa_id", empresaId),
      "bancos de horas"
    );
    if (bancos.length === 0) return [];
    return (await consultar2(
      cliente.from("bancos_horas_fechamentos").select("id, banco_id, mes, ano, fechado_em").in(
        "banco_id",
        bancos.map((b) => b.id)
      ).eq("vigente", true).gte("ano", de.ano).lte("ano", ate.ano),
      "fechamentos do modelo novo"
    )).filter((f) => indice5(f) >= indice5(de) && indice5(f) <= indice5(ate));
  }
  return {
    async empresasEmLegado() {
      const empresas = await consultar2(
        cliente.from("empresas").select("id, nome_completo").eq("modelo_calculo", "legado").eq("status", "ativo").order("nome_completo"),
        "empresas em Legado"
      );
      return empresas.map((e) => ({ id: e.id, nomeLegado: e.nome_completo }));
    },
    async fechamentosLegado(empresaId, de, ate) {
      const linhas = await consultar2(
        cliente.from("banco_horas_fechamentos").select(COLUNAS_FECHAMENTO_LEGADO).eq("empresa_id", empresaId).gte("ano", de.ano).lte("ano", ate.ano),
        "fechamentos do legado"
      );
      return linhas.filter((f) => indice5(f) >= indice5(de) && indice5(f) <= indice5(ate)).map(doFechamentoLegado);
    },
    async ultimoFechamentoLegado(empresaId) {
      const [ultimo] = await consultar2(
        cliente.from("banco_horas_fechamentos").select(COLUNAS_FECHAMENTO_LEGADO).eq("empresa_id", empresaId).order("ano", { ascending: false }).order("mes", { ascending: false }).limit(1),
        "\xFAltimo fechamento do legado"
      );
      return ultimo ? doFechamentoLegado(ultimo) : null;
    },
    async fechamentosNovos(empresaId, de, ate) {
      return (await fechamentosVigentes(empresaId, de, ate)).map((f) => ({
        mes: { mes: f.mes, ano: f.ano },
        fechadoEm: f.fechado_em
      }));
    },
    async itensFechados(empresaId, mes) {
      const fechamentos = await fechamentosVigentes(empresaId, mes, mes);
      if (fechamentos.length === 0) return [];
      const itens = await consultar2(
        cliente.from("bancos_horas_fechamento_itens").select("tipo, item_id, minutos, tickets").in(
          "fechamento_id",
          fechamentos.map((f) => f.id)
        ).in("tipo", ["apontamento", "ticket"]),
        "itens dos fechamentos"
      );
      return itens.map((i) => ({
        chave: i.item_id,
        fonte: i.tipo,
        minutos: i.minutos,
        tickets: i.tickets
      }));
    },
    async organizacoes(empresaId) {
      const linhas = await consultar2(
        cliente.from("empresas_organizacoes_aranda").select("nome_organizacao").eq("empresa_id", empresaId).eq("ativo", true),
        "organiza\xE7\xF5es do Aranda"
      );
      return linhas.map((o) => o.nome_organizacao);
    },
    async codigos() {
      const linhas = await consultar2(
        cliente.from("codigos_resolucao_banco").select("codigo, conta_horas, conta_tickets"),
        "c\xF3digos de resolu\xE7\xE3o"
      );
      return linhas.map((c) => ({
        codigo: c.codigo,
        contaHoras: c.conta_horas,
        contaTickets: c.conta_tickets
      }));
    },
    async itensDoLegado(apontamentos, tickets) {
      const [aps, tks] = await Promise.all([
        emLotes(
          apontamentos,
          (lote) => cliente.from("apontamentos_aranda").select(COLUNAS_APONTAMENTO).in("id_externo", lote),
          "apontamentos do legado"
        ),
        emLotes(
          tickets,
          (lote) => cliente.from("apontamentos_tickets_aranda").select(COLUNAS_TICKET).in("nro_solicitacao", lote),
          "tickets do legado"
        )
      ]);
      return [...aps.map(doApontamento), ...tks.map(doTicket)];
    },
    async dadosDosItens({ apontamentos, tickets }) {
      const [aps, tks] = await Promise.all([
        emLotes(
          apontamentos,
          (lote) => cliente.from("apontamentos_aranda").select(COLUNAS_APONTAMENTO).in("id", lote),
          "apontamentos"
        ),
        emLotes(
          tickets,
          (lote) => cliente.from("apontamentos_tickets_aranda").select(COLUNAS_TICKET).in("id", lote),
          "tickets"
        )
      ]);
      return [...aps.map(doApontamento), ...tks.map(doTicket)].map(semIdLegado);
    },
    async trocasDeCodigo(chamados) {
      const numero3 = new Map(chamados.map((c) => [c, c.replace(/\D/g, "")]));
      const numeros = [...new Set([...numero3.values()].filter(Boolean))];
      const linhas = await emLotes(
        numeros,
        (lote) => cliente.from("codigo_resolucao_modificacoes_aranda").select("item_id, created").in("item_id", lote),
        "trocas de c\xF3digo de resolu\xE7\xE3o"
      );
      const ultima = /* @__PURE__ */ new Map();
      for (const l of linhas) {
        const atual = ultima.get(l.item_id);
        if (!atual || Date.parse(l.created) > Date.parse(atual)) ultima.set(l.item_id, l.created);
      }
      const trocas = /* @__PURE__ */ new Map();
      for (const [chamado, n] of numero3) {
        const created = ultima.get(n);
        if (created) trocas.set(chamado, trocaEmUtc(created));
      }
      return trocas;
    },
    async reajustesDepoisDoFechamento(empresaId, mes, fechadoEm) {
      const total = { horas: 0, tickets: 0 };
      const bancos = await consultar2(
        cliente.from("bancos_horas").select("id").eq("empresa_id", empresaId),
        "bancos de horas"
      );
      if (bancos.length === 0) return total;
      const reajustes = await consultar2(
        cliente.from("bancos_horas_reajustes").select("tipo, minutos, tickets").in(
          "banco_id",
          bancos.map((b) => b.id)
        ).eq("mes", mes.mes).eq("ano", mes.ano).eq("ativo", true).gt("created_at", fechadoEm),
        "reajustes lan\xE7ados depois do fechamento"
      );
      for (const r of reajustes) {
        const sinal = r.tipo === "saida" ? -1 : 1;
        total.horas += sinal * (r.minutos ?? 0);
        total.tickets += sinal * (r.tickets ?? 0);
      }
      return total;
    },
    async gravar(payload) {
      const { error } = await cliente.rpc("bancos_horas_gravar_comparacao", {
        p_comparacao: payload
      });
      if (error) throw new Error(`Falha ao gravar a compara\xE7\xE3o: ${error.message}`);
    },
    async registrarErro(empresaId, mensagem) {
      const { error } = await cliente.rpc("bancos_horas_erro_comparacao", {
        p_empresa_id: empresaId,
        p_erro: mensagem
      });
      if (error) throw new Error(`Falha ao registrar o erro da compara\xE7\xE3o: ${error.message}`);
    }
  };
}

// sync-api/scripts/comparacao/entrada.ts
function rodarModoSombra(cliente, opcoes) {
  const c = cliente;
  return executarModoSombra(
    // Um repositório por empresa: o cache de leituras não passa de uma empresa para outra
    { motor: () => criarRepositorioSupabase(c), sombra: criarRepositorioSombra(c) },
    opcoes
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  rodarModoSombra
});

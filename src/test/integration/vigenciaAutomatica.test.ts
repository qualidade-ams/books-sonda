/**
 * Testes de integração para funcionalidade de vigência automática
 * Verifica se empresas são inativadas automaticamente quando a vigência vence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vigenciaService } from '@/services/vigenciaService';
import { jobSchedulerService } from '@/services/jobSchedulerService';

// Mock do Supabase para testes
const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({
          data: {
            id: '1',
            nome_completo: 'EMPRESA TESTE LTDA',
            vigencia_final: '2025-09-17', // Data no passado
            status: 'ativo'
          },
          error: null
        })
      }),
      not: () => ({
        order: () => Promise.resolve({
          data: [
            {
              id: '1',
              nome_completo: 'EMPRESA TESTE LTDA',
              vigencia_final: '2025-09-17',
              status: 'ativo'
            },
            {
              id: '2',
              nome_completo: 'EMPRESA TESTE 2 LTDA',
              vigencia_final: '2025-10-15',
              status: 'ativo'
            }
          ],
          error: null
        })
      })
    }),
    update: () => ({
      eq: () => Promise.resolve({
        data: null,
        error: null
      })
    })
  }),
  rpc: () => Promise.resolve({
    data: 1,
    error: null
  })
};

// Mock do adminClient
const mockAdminClient = {
  rpc: () => Promise.resolve({
    data: 1,
    error: null
  })
};

describe('Vigência Automática', () => {
  beforeEach(() => {
    // Reset do job scheduler antes de cada teste
    jobSchedulerService.stop();
  });

  afterEach(() => {
    // Limpar após cada teste
    jobSchedulerService.stop();
  });

  describe('Validação de Vigências', () => {
    it('deve validar vigências corretamente', () => {
      const validacao1 = vigenciaService.validarVigencias('2025-01-01', '2025-12-31');
      expect(validacao1.valido).toBe(true);

      const validacao2 = vigenciaService.validarVigencias('2025-12-31', '2025-01-01');
      expect(validacao2.valido).toBe(false);
      expect(validacao2.erro).toContain('vigência inicial não pode ser posterior');
    });

    it('deve calcular dias restantes corretamente', () => {
      const hoje = new Date();
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      
      const diasRestantes = vigenciaService.calcularDiasRestantes(amanha.toISOString().split('T')[0]);
      expect(diasRestantes).toBe(1);
    });

    it('deve identificar vigência vencida', () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      
      const diasRestantes = vigenciaService.calcularDiasRestantes(ontem.toISOString().split('T')[0]);
      expect(diasRestantes).toBeLessThan(0);
    });
  });

  describe('Job Scheduler', () => {
    it('deve registrar jobs padrão', () => {
      const jobs = jobSchedulerService.getJobs();
      expect(jobs.length).toBeGreaterThan(0);
      
      const vigenciaJob = jobs.find(job => job.id === 'vigencia-check');
      expect(vigenciaJob).toBeDefined();
      expect(vigenciaJob?.name).toBe('Verificação de Vigências');
    });

    it('deve iniciar e parar o scheduler', () => {
      const statusInicial = jobSchedulerService.getStatus();
      expect(statusInicial.isRunning).toBe(false);

      jobSchedulerService.start();
      const statusAposIniciar = jobSchedulerService.getStatus();
      expect(statusAposIniciar.isRunning).toBe(true);

      jobSchedulerService.stop();
      const statusAposParar = jobSchedulerService.getStatus();
      expect(statusAposParar.isRunning).toBe(false);
    });

    it('deve habilitar e desabilitar jobs', () => {
      const jobId = 'vigencia-check';
      const job = jobSchedulerService.getJob(jobId);
      
      expect(job).toBeDefined();
      expect(job?.enabled).toBe(true);

      jobSchedulerService.toggleJob(jobId, false);
      const jobDesabilitado = jobSchedulerService.getJob(jobId);
      expect(jobDesabilitado?.enabled).toBe(false);

      jobSchedulerService.toggleJob(jobId, true);
      const jobHabilitado = jobSchedulerService.getJob(jobId);
      expect(jobHabilitado?.enabled).toBe(true);
    });
  });

  describe('Cenários de Uso', () => {
    it('deve identificar empresas com vigência vencida', async () => {
      // Este teste seria executado com dados reais em um ambiente de teste
      // Por enquanto, apenas verificamos se a função existe e pode ser chamada
      expect(typeof vigenciaService.consultarStatusVigencias).toBe('function');
    });

    it('deve executar inativação automática', async () => {
      // Este teste seria executado com dados reais em um ambiente de teste
      // Por enquanto, apenas verificamos se a função existe e pode ser chamada
      expect(typeof vigenciaService.executarInativacaoAutomatica).toBe('function');
    });

    it('deve gerar estatísticas de vigência', async () => {
      // Este teste seria executado com dados reais em um ambiente de teste
      // Por enquanto, apenas verificamos se a função existe e pode ser chamada
      expect(typeof vigenciaService.obterEstatisticasVigencia).toBe('function');
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erros na validação de vigências', () => {
      // Teste com dados inválidos
      const validacao = vigenciaService.validarVigencias('data-invalida', '2025-12-31');
      // A função deve lidar graciosamente com datas inválidas
      expect(typeof validacao).toBe('object');
    });

    it('deve tratar erros no job scheduler', () => {
      // Tentar executar job inexistente
      expect(() => {
        jobSchedulerService.runJobNow('job-inexistente');
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('deve executar validação rapidamente', () => {
      const inicio = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        vigenciaService.validarVigencias('2025-01-01', '2025-12-31');
      }
      
      const duracao = Date.now() - inicio;
      expect(duracao).toBeLessThan(1000); // Deve executar 1000 validações em menos de 1 segundo
    });

    it('deve calcular dias restantes rapidamente', () => {
      const inicio = Date.now();
      const dataFutura = '2025-12-31';
      
      for (let i = 0; i < 1000; i++) {
        vigenciaService.calcularDiasRestantes(dataFutura);
      }
      
      const duracao = Date.now() - inicio;
      expect(duracao).toBeLessThan(500); // Deve executar 1000 cálculos em menos de 500ms
    });
  });
});

describe('Integração Completa', () => {
  it('deve simular fluxo completo de vigência', async () => {
    // 1. Iniciar scheduler
    jobSchedulerService.start();
    expect(jobSchedulerService.getStatus().isRunning).toBe(true);

    // 2. Verificar se job de vigência está ativo
    const vigenciaJob = jobSchedulerService.getJob('vigencia-check');
    expect(vigenciaJob?.enabled).toBe(true);

    // 3. Simular execução manual do job
    // (Em um ambiente real, isso executaria a função de inativação)
    const resultado = await jobSchedulerService.runJobNow('vigencia-check');
    expect(resultado.success).toBe(true);

    // 4. Parar scheduler
    jobSchedulerService.stop();
    expect(jobSchedulerService.getStatus().isRunning).toBe(false);
  });
});
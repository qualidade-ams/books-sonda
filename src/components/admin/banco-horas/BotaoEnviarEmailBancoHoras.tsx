/**
 * BotaoEnviarEmailBancoHoras Component
 *
 * Botão para enviar o email de Saldo Parcial com dados da Visão Consolidada.
 * O fechamento mensal (Saldo do Mês) segue no email do Book.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Mail, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { emailService } from '@/services/emailService';
import { MESES_PT } from '@/services/bancoHorasTableService';
import type { BancoHorasCalculo } from '@/types/bancoHoras';
import type { Requerimento } from '@/types/requerimentos';
import { gerarExcelConsumoHoras } from '@/utils/gerarExcelConsumoHoras';
import { useEmailsClientesPorFinalidade } from '@/hooks/useClientes';
import { FINALIDADES_SALDO_PARCIAL } from '@/types/clientBooksTypes';
import {
  getTextoPadraoParcial,
  gerarAssuntoSaldoParcial,
  gerarHtmlTabelasSaldoParcial,
  gerarHtmlCorpoSaldoParcial,
  gerarHtmlRenderizacaoTabelas,
  gerarHtmlEnvioComImagem,
  type DadosEmailSaldoParcial,
  type ObservacaoSaldoParcial
} from '@/services/saldoParcial/emailSaldoParcial';
import { uploadAnexosTemporarios, uploadImagemTabelas } from '@/services/saldoParcial/storageSaldoParcial';

type Observacao = ObservacaoSaldoParcial;

interface BotaoEnviarEmailBancoHorasProps {
  calculos: BancoHorasCalculo[];
  empresaId?: string;
  empresaNome?: string;
  tipoCobranca?: string;
  mesAno: { mes: number; ano: number };
  percentualRepasse?: number;
  nomePeriodo?: string;
  requerimentos?: Requerimento[];
  requerimentosEmDesenvolvimento?: Requerimento[];
  observacoes?: Observacao[];
  disabled?: boolean;
  diaInicioApuracao?: number;
  diaFimApuracao?: number;
  /** Se true, gera emails em inglês. Detectado pelo template padrão da empresa. */
  isEnglish?: boolean;
}

export function BotaoEnviarEmailBancoHoras({
  calculos,
  empresaId,
  empresaNome = 'Cliente',
  tipoCobranca = 'Banco de Horas',
  mesAno,
  percentualRepasse = 100,
  nomePeriodo = '',
  requerimentos = [],
  requerimentosEmDesenvolvimento = [],
  observacoes = [],
  disabled = false,
  diaInicioApuracao = 1,
  diaFimApuracao = 0,
  isEnglish = false,
}: BotaoEnviarEmailBancoHorasProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Destinatários padrão: contatos da empresa marcados como "Saldo Parcial" ou "Ambos"
  const { emails: emailsSaldoParcial } = useEmailsClientesPorFinalidade(empresaId, FINALIDADES_SALDO_PARCIAL);

  const [modalAberto, setModalAberto] = useState(false);
  const [destinatariosEditados, setDestinatariosEditados] = useState(false);
  const [destinatariosTexto, setDestinatariosTexto] = useState('');
  const [destinatariosCCTexto, setDestinatariosCCTexto] = useState('');
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [corpoEmail, setCorpoEmail] = useState('');
  const [textoIntrodutorio, setTextoIntrodutorio] = useState('');
  const [anexos, setAnexos] = useState<File[]>([]);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  
  // Estados para renderização de tabelas como imagem (evitar distorção no Outlook)
  const [gerandoImagem, setGerandoImagem] = useState(false);
  const [tabelasImagemUrl, setTabelasImagemUrl] = useState<string | null>(null);
  const [tabelasImagemBase64, setTabelasImagemBase64] = useState<string | null>(null);

  /**
   * Renderiza as tabelas (banco de horas, requerimentos, observações) como imagem PNG
   * usando o endpoint /api/email/render-image (Puppeteer).
   * Faz upload para Supabase Storage e retorna URL pública.
   */
  const renderizarTabelasComoImagem = async (htmlTabelas: string) => {
    setGerandoImagem(true);
    setTabelasImagemUrl(null);
    setTabelasImagemBase64(null);
    
    try {
      const htmlParaRenderizar = gerarHtmlRenderizacaoTabelas(htmlTabelas);

      const response = await fetch('/api/email/render-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlParaRenderizar, width: 1200 })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.image) {
          setTabelasImagemBase64(data.image);
          
          // Upload da imagem para Supabase Storage (sem upload, o envio usa o base64)
          const urlImagem = await uploadImagemTabelas(data.image, empresaNome);
          if (urlImagem) {
            setTabelasImagemUrl(urlImagem);
          }

          console.log('✅ Tabelas renderizadas como imagem com sucesso');
        }
      } else {
        console.warn('⚠️ Falha ao renderizar tabelas como imagem, email será enviado como HTML');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao renderizar tabelas como imagem:', error);
    } finally {
      setGerandoImagem(false);
    }
  };

  // Dados das tabelas do e-mail: os mesmos exibidos na Visão Consolidada
  const dadosEmail: DadosEmailSaldoParcial = {
    calculos,
    tipoCobranca,
    percentualRepasse,
    nomePeriodo,
    requerimentos,
    requerimentosEmDesenvolvimento,
    observacoes,
    diaInicioApuracao,
    diaFimApuracao,
    isEnglish
  };

  const handleAbrirModal = () => {
    setAssuntoEmail(gerarAssuntoSaldoParcial(empresaNome, mesAno));
    const texto = getTextoPadraoParcial(isEnglish);
    setTextoIntrodutorio(texto);
    setCorpoEmail(gerarHtmlCorpoSaldoParcial(texto, dadosEmail));

    setDestinatariosTexto(emailsSaldoParcial.join('; '));
    setDestinatariosEditados(false);
    setDestinatariosCCTexto('');
    setAnexos([]);
    setModalAberto(true);
    
    // Gerar Excel de consumo de horas automaticamente e adicionar aos anexos
    if (empresaId) {
      gerarExcelConsumoHoras(
        empresaId,
        empresaNome,
        mesAno.mes,
        mesAno.ano,
        [...requerimentos, ...requerimentosEmDesenvolvimento],
        observacoes,
        diaInicioApuracao,
        diaFimApuracao
      ).then(excelFile => {
        if (excelFile) {
          setAnexos(prev => [...prev, excelFile]);
          console.log('✅ Excel de consumo de horas adicionado aos anexos do modal');
        }
      }).catch(err => {
        console.warn('⚠️ Não foi possível gerar Excel de consumo:', err);
      });
    }
    
    // Renderizar tabelas como imagem (assíncrono, não bloqueia abertura do modal)
    const htmlTabelas = gerarHtmlTabelasSaldoParcial(dadosEmail);
    renderizarTabelasComoImagem(htmlTabelas);
  };

  // Atualizar preview quando texto introdutório muda
  const handleTextoChange = (novoTexto: string) => {
    setTextoIntrodutorio(novoTexto);
    setCorpoEmail(gerarHtmlCorpoSaldoParcial(novoTexto, dadosEmail));
  };

  // Se os contatos chegarem depois da abertura do modal, preenche enquanto o usuário não editou
  useEffect(() => {
    if (modalAberto && !destinatariosEditados && !destinatariosTexto && emailsSaldoParcial.length > 0) {
      setDestinatariosTexto(emailsSaldoParcial.join('; '));
    }
  }, [modalAberto, destinatariosEditados, destinatariosTexto, emailsSaldoParcial]);

  // Funções de anexo
  const handleAdicionarAnexos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const tamanhoAtual = anexos.reduce((acc, f) => acc + f.size, 0);
    const tamanhoNovos = files.reduce((acc, f) => acc + f.size, 0);
    const LIMITE_25MB = 25 * 1024 * 1024;
    
    if (tamanhoAtual + tamanhoNovos > LIMITE_25MB) {
      toast({ title: 'Limite excedido', description: 'O total de anexos não pode ultrapassar 25MB.', variant: 'destructive' });
      return;
    }
    setAnexos([...anexos, ...files]);
    e.target.value = '';
  };

  const handleRemoverAnexo = (index: number) => {
    setAnexos(anexos.filter((_, i) => i !== index));
  };

  const formatarTamanhoArquivo = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const extrairEmails = (texto: string): string[] => {
    return texto.split(/[;,]/).map(e => e.trim()).filter(e => e.length > 0);
  };

  const isFormularioValido = () => {
    const emails = extrairEmails(destinatariosTexto);
    return emails.length > 0 && assuntoEmail.trim().length > 0;
  };

  const handleEnviarEmail = async () => {
    try {
      setEnviandoEmail(true);
      const destinatarios = extrairEmails(destinatariosTexto);
      const destinatariosCC = extrairEmails(destinatariosCCTexto);
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailsInvalidos = [...destinatarios, ...destinatariosCC].filter(e => !emailRegex.test(e));
      
      if (emailsInvalidos.length > 0) {
        toast({ title: 'Emails inválidos', description: `Emails inválidos: ${emailsInvalidos.join(', ')}`, variant: 'destructive' });
        setEnviandoEmail(false);
        return;
      }

      // Upload de anexos se houver
      let dadosAnexos = undefined;
      if (anexos.length > 0) {
        try {
          dadosAnexos = await uploadAnexosTemporarios(anexos);
        } catch (error) {
          console.error('Erro ao fazer upload dos anexos:', error);
          toast({ title: 'Erro', description: 'Erro ao fazer upload dos anexos.', variant: 'destructive' });
          setEnviandoEmail(false);
          return;
        }
      }

      // Montar HTML final para envio
      // Se temos imagem das tabelas, usar imagem; senão fallback para HTML
      let htmlParaEnvio = corpoEmail;
      
      if (tabelasImagemUrl || tabelasImagemBase64) {
        // Reconstruir o email com texto como HTML + tabelas como imagem
        const imgSrc = tabelasImagemUrl || `data:image/png;base64,${tabelasImagemBase64}`;
        htmlParaEnvio = gerarHtmlEnvioComImagem(textoIntrodutorio, isEnglish, imgSrc);
        console.log(`📸 Enviando email com tabelas como imagem via ${tabelasImagemUrl ? 'URL pública' : 'base64'}`);
      } else {
        console.log('📧 Enviando email como HTML (sem imagem renderizada das tabelas)');
      }

      const resultado = await emailService.sendEmail({
        to: destinatarios,
        cc: destinatariosCC.length > 0 ? destinatariosCC : undefined,
        subject: assuntoEmail,
        html: htmlParaEnvio,
        anexos: dadosAnexos,
      });

      if (resultado.success) {
        toast({ title: 'Email enviado!', description: `Saldo parcial enviado para ${destinatarios.length} destinatário(s).` });
        setModalAberto(false);
        setConfirmacaoAberta(false);
      } else {
        toast({ title: 'Erro ao enviar', description: resultado.error || 'Erro desconhecido.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Erro ao enviar email banco de horas:', error);
      toast({ title: 'Erro', description: 'Erro inesperado ao enviar email.', variant: 'destructive' });
    } finally {
      setEnviandoEmail(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || calculos.length === 0}
        onClick={handleAbrirModal}
        title={t('bankHours.partialBalanceDesc')}
        aria-label={t('bankHours.sendPartialBalance')}
        className="flex items-center gap-2 text-xs sm:text-sm print:hidden"
      >
        <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">{t('bankHours.sendPartialBalance')}</span>
      </Button>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              {t('bankHours.sendPartialBalance')}
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                {t('bankHours.partial')}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">{t('bankHours.recipients')}</Label>
              <div className="mt-2">
                <textarea
                  placeholder={t('bankHours.recipientsPlaceholder')}
                  className="w-full p-3 border rounded-md text-sm min-h-[80px] bg-white dark:bg-gray-800 font-mono focus:ring-sonda-blue focus:border-sonda-blue"
                  value={destinatariosTexto}
                  onChange={(e) => {
                    setDestinatariosTexto(e.target.value);
                    setDestinatariosEditados(true);
                  }}
                />
                {extrairEmails(destinatariosTexto).length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">✓ {extrairEmails(destinatariosTexto).length} email(s)</p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">{t('bankHours.ccOptional')}</Label>
              <div className="mt-2">
                <textarea
                  placeholder={t('bankHours.ccPlaceholder')}
                  className="w-full p-3 border rounded-md text-sm min-h-[60px] bg-white dark:bg-gray-800 font-mono focus:ring-sonda-blue focus:border-sonda-blue"
                  value={destinatariosCCTexto}
                  onChange={(e) => setDestinatariosCCTexto(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="assunto-bh" className="text-base font-medium">{t('bankHours.subject')}</Label>
              <Input
                id="assunto-bh"
                value={assuntoEmail}
                onChange={(e) => setAssuntoEmail(e.target.value)}
                placeholder={t('bankHours.subjectPlaceholder')}
                className="mt-2 focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>

            <div>
              <Label className="text-base font-medium">{t('bankHours.emailText')}</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">{t('bankHours.emailTextDesc')}</p>
              <textarea
                className="w-full p-3 border rounded-md text-sm min-h-[180px] bg-white dark:bg-gray-800 focus:ring-sonda-blue focus:border-sonda-blue"
                value={textoIntrodutorio}
                onChange={(e) => handleTextoChange(e.target.value)}
              />
            </div>

            {/* Anexos */}
            <div>
              <Label className="text-base font-medium">{t('bankHours.attachments')}</Label>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-input-bh')?.click()}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {t('bankHours.addFiles')}
                  </Button>
                  <input
                    id="file-input-bh"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAdicionarAnexos}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  />
                  <span className="text-xs text-gray-500">{t('bankHours.sizeLimit')}</span>
                </div>

                {anexos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span>{t('bankHours.filesAttached', { count: anexos.length })}</span>
                      <span className="text-xs text-gray-500">
                        {t('bankHours.totalSize', { size: formatarTamanhoArquivo(anexos.reduce((acc, file) => acc + file.size, 0)) })}
                      </span>
                    </div>
                    <div className="border rounded-lg divide-y dark:divide-gray-700">
                      {anexos.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatarTamanhoArquivo(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverAnexo(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">{t('bankHours.emailPreview')}</Label>
              <div className="mt-2 border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>{t('bankHours.previewType')}:</strong> {t('bankHours.partialBalance')} |{' '}
                    <strong>{t('bankHours.previewCompany')}:</strong> {empresaNome} |{' '}
                    <strong>{t('bankHours.previewPeriod')}:</strong> {MESES_PT[mesAno.mes - 1]} {mesAno.ano}
                  </div>
                </div>
                <div
                  className="max-h-[500px] overflow-y-auto p-4"
                  dangerouslySetInnerHTML={{ __html: corpoEmail }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center gap-2">
            {gerandoImagem && (
              <span className="text-xs text-gray-500 mr-2">{t('bankHours.generatingImage')}</span>
            )}
            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => setConfirmacaoAberta(true)}
              disabled={!isFormularioValido() || enviandoEmail || gerandoImagem}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <Send className="h-4 w-4 mr-2" />
              {gerandoImagem ? t('bankHours.wait') : t('common.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              {t('bankHours.confirmSend')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p>
                {t('bankHours.confirmSendDescPre')}{' '}
                <strong>{t('bankHours.partialBalance')}</strong>{' '}
                {t('bankHours.confirmSendDescMid')}{' '}
                <strong>{extrairEmails(destinatariosTexto).length} {t('bankHours.recipientsCount')}</strong>?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviandoEmail}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnviarEmail}
              disabled={enviandoEmail}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              {enviandoEmail ? t('bankHours.sending') : t('bankHours.confirmSend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Send, RefreshCw, Paperclip, Loader2, Mail } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { useToast } from '@/hooks/use-toast';
import { booksDisparoService, type PreviewBookEmpresa } from '@/services/booksDisparoService';

interface PreviewEmailBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  empresaNome: string;
  mes: number;
  ano: number;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal de pré-visualização do e-mail de book de uma empresa.
 * Mostra o e-mail exatamente como será enviado (100% fiel) e permite
 * disparar um e-mail de teste para um endereço arbitrário.
 */
const PreviewEmailBookModal = ({
  open,
  onOpenChange,
  empresaId,
  empresaNome,
  mes,
  ano,
}: PreviewEmailBookModalProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewBookEmpresa | null>(null);

  const [emailTeste, setEmailTeste] = useState('');
  const [enviandoTeste, setEnviandoTeste] = useState(false);

  // Altura do conteúdo do iframe, para evitar scroll interno duplicado
  const [alturaCorpo, setAlturaCorpo] = useState(420);

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;

    const medir = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          const altura = Math.max(
            doc.body.scrollHeight,
            doc.body.offsetHeight,
            doc.documentElement?.scrollHeight || 0,
            doc.documentElement?.offsetHeight || 0
          );
          if (altura > 0) {
            // Folga para evitar corte por arredondamento/margens
            setAlturaCorpo(altura + 24);
          }
        }
      } catch {
        // Se não for possível medir (cross-origin), mantém altura padrão
      }
    };

    // Medir logo e remedir após o carregamento das imagens do e-mail
    medir();
    setTimeout(medir, 300);
    setTimeout(medir, 1000);

    try {
      const doc = iframe.contentDocument;
      const imgs = doc?.images;
      if (imgs) {
        Array.from(imgs).forEach((img) => {
          if (!img.complete) {
            img.addEventListener('load', medir, { once: true });
            img.addEventListener('error', medir, { once: true });
          }
        });
      }
    } catch {
      // ignora
    }
  };

  const gerarPreview = async () => {
    if (!empresaId) return;
    setCarregando(true);
    setErro(null);
    setPreview(null);
    setAlturaCorpo(420);
    try {
      const resultado = await booksDisparoService.previewBookEmpresa(empresaId, mes, ano);
      setPreview(resultado);
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : t('disparos.preview.errorTitle');
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  // Gerar preview sempre que o modal abrir (ou mudar empresa/período)
  useEffect(() => {
    if (open) {
      setEmailTeste('');
      gerarPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empresaId, mes, ano]);

  const emailTesteValido = emailRegex.test(emailTeste.trim());

  const handleEnviarTeste = async () => {
    if (!emailTesteValido) {
      toast({
        title: t('disparos.preview.invalidEmailTitle'),
        description: t('disparos.preview.invalidEmailDesc'),
        variant: 'destructive',
      });
      return;
    }

    setEnviandoTeste(true);
    try {
      const resultado = await booksDisparoService.enviarEmailTesteEmpresa(
        empresaId,
        mes,
        ano,
        emailTeste.trim()
      );

      if (resultado.sucesso) {
        toast({
          title: t('disparos.preview.testSentTitle'),
          description: t('disparos.preview.testSentDesc', { email: emailTeste.trim() }),
        });
      } else {
        toast({
          title: t('disparos.preview.testFailedTitle'),
          description: resultado.erro || t('disparos.preview.testFailedDesc'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('disparos.preview.testFailedTitle'),
        description: error instanceof Error ? error.message : t('disparos.preview.testFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setEnviandoTeste(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('disparos.preview.title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {t('disparos.preview.description', {
              company: empresaNome,
              month: String(mes).padStart(2, '0'),
              year: ano,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
          {/* Estado: carregando */}
          {carregando && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
              <p className="text-sm text-gray-500">{t('disparos.preview.generating')}</p>
            </div>
          )}

          {/* Estado: erro */}
          {!carregando && erro && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Mail className="h-10 w-10 text-red-400" />
              <p className="text-sm text-red-600 max-w-md">{erro}</p>
              <Button variant="outline" size="sm" onClick={gerarPreview}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('disparos.preview.retry')}
              </Button>
            </div>
          )}

          {/* Estado: preview pronto */}
          {!carregando && !erro && preview && (
            <>
              {/* Metadados do e-mail (destinatários reais - informativo) */}
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 p-4 space-y-2 text-sm">
                <div className="flex flex-wrap gap-x-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {t('disparos.preview.subject')}
                  </span>
                  <span className="text-gray-900 dark:text-white">{preview.assunto}</span>
                </div>
                <div className="break-all text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300 mr-2">
                    {t('disparos.preview.to')}
                  </span>
                  {preview.emailsPara.length > 0 ? preview.emailsPara.join(', ') : '—'}
                </div>
                {preview.emailsCC.length > 0 && (
                  <div className="break-all text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300 mr-2">
                      {t('disparos.preview.cc')}
                    </span>
                    {preview.emailsCC.join(', ')}
                  </div>
                )}
                {preview.temAnexos && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Paperclip className="h-4 w-4 text-gray-500" />
                    {preview.nomesAnexos.map((nome, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {nome}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 pt-1">
                  {t('disparos.preview.recipientsHint')}
                </p>
              </div>

              {/* Preview do corpo do e-mail */}
              <div className="flex flex-col min-h-[280px]">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex-shrink-0">
                  {t('disparos.preview.bodyTitle')}
                </h4>
                <div
                  className="border rounded-lg overflow-auto bg-white"
                  style={{ maxHeight: '440px' }}
                >
                  <div className="flex justify-center min-w-fit">
                    <iframe
                      title={t('disparos.preview.bodyTitle')}
                      srcDoc={preview.corpo}
                      sandbox="allow-same-origin"
                      scrolling="no"
                      onLoad={handleIframeLoad}
                      className="block flex-shrink-0"
                      style={{ width: '1100px', height: `${alturaCorpo}px`, border: 0 }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé: envio de teste */}
        <div className="flex-shrink-0 border-t pt-4 space-y-2">
          <Label htmlFor="email-teste" className="text-sm font-medium text-gray-700">
            {t('disparos.preview.sendTestTo')}
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="email-teste"
              type="email"
              placeholder={t('disparos.preview.testEmailPlaceholder')}
              value={emailTeste}
              onChange={(e) => setEmailTeste(e.target.value)}
              disabled={enviandoTeste || carregando || !!erro}
              className="focus:ring-sonda-blue focus:border-sonda-blue flex-1"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={enviandoTeste}
              >
                {t('disparos.preview.close')}
              </Button>
              <Button
                onClick={handleEnviarTeste}
                disabled={!emailTesteValido || enviandoTeste || carregando || !!erro}
                className="bg-sonda-blue hover:bg-sonda-dark-blue whitespace-nowrap"
              >
                {enviandoTeste ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('disparos.preview.sendingTest')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t('disparos.preview.sendTest')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewEmailBookModal;

import React, { useRef, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { useEmailTemplatePreview } from '@/hooks/useEmailTemplatePreview';
import { FormularioData } from '@/hooks/useEmailVariableMapping';

interface EmailPreviewProps {
  template: {
    assunto: string;
    corpo: string;
  };
  dadosPersonalizados?: FormularioData;
}

const EmailPreview: React.FC<EmailPreviewProps> = ({ template, dadosPersonalizados }) => {
  const { previewData } = useEmailTemplatePreview(template, dadosPersonalizados);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  // Ajusta a altura do iframe ao conteúdo renderizado
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const adjustHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          const height = doc.body.scrollHeight;
          if (height > 0) {
            setIframeHeight(Math.max(400, height + 32));
          }
        }
      } catch {
        // Ignora erros de cross-origin (não deve acontecer com srcDoc)
      }
    };

    iframe.addEventListener('load', adjustHeight);
    return () => iframe.removeEventListener('load', adjustHeight);
  }, [previewData.corpoComDados]);

  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            padding: 8px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: #fff;
          }
          img { max-width: 100%; height: auto; }
          table { max-width: 100%; }
        </style>
      </head>
      <body>${previewData.corpoComDados}</body>
    </html>
  `;

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <Label className="text-sm font-medium text-gray-600">Assunto:</Label>
        <p className="font-semibold mt-1">{previewData.assuntoComDados}</p>
      </div>
      
      <div className="border rounded-lg bg-white overflow-hidden">
        <Label className="text-sm font-medium text-gray-600 mb-3 block px-4 pt-4">Pré-visualização por e-mail:</Label>
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title="Preview do E-mail"
          className="w-full border-0"
          style={{ height: `${iframeHeight}px`, minHeight: '400px' }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
};

export default EmailPreview;

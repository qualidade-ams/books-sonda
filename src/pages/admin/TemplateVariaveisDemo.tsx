/**
 * Página dedicada para demonstração das variáveis do template de elogios
 * Pode ser acessada diretamente para ver como as variáveis ficam processadas
 */

import AdminLayout from '@/components/admin/LayoutAdmin';
import TemplateVariablesDemo from '@/components/admin/templates/TemplateVariablesDemo';

export default function TemplateVariaveisDemo() {
  return (
    <AdminLayout>
      <TemplateVariablesDemo />
    </AdminLayout>
  );
}
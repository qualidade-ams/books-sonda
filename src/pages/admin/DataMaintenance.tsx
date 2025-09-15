import React from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import DataNormalizationTool from '@/components/admin/DataNormalizationTool';

const DataMaintenance: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manutenção de Dados</h1>
            <p className="text-gray-600">
              Ferramentas para verificar e corrigir a consistência dos dados no sistema
            </p>
          </div>
        </div>

        <DataNormalizationTool />
      </div>
    </AdminLayout>
  );
};

export default DataMaintenance;
import React from 'react';
import PermissionsFixer from '@/components/admin/PermissionsFixer';

const FixPermissions: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Configuração de Permissões
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure as permissões do seu usuário para acessar o sistema administrativo
          </p>
        </div>
        
        <PermissionsFixer />
      </div>
    </div>
  );
};

export default FixPermissions;
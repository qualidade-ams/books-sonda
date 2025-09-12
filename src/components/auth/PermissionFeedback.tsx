import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Info } from 'lucide-react';

interface PermissionFeedbackProps {
  message?: string;
  variant?: 'info' | 'warning';
  className?: string;
}

/**
 * Component to show feedback messages when users don't have permission to perform actions
 */
const PermissionFeedback: React.FC<PermissionFeedbackProps> = ({ 
  message = "Você não tem permissão para realizar esta ação.",
  variant = 'info',
  className = ""
}) => {
  const Icon = variant === 'warning' ? Lock : Info;
  
  return (
    <Alert className={`border-gray-200 bg-gray-50 ${className}`}>
      <Icon className="h-4 w-4" />
      <AlertDescription className="text-gray-600">
        {message}
      </AlertDescription>
    </Alert>
  );
};

export default PermissionFeedback;
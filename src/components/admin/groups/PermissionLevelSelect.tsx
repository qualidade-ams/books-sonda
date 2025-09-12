import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ban, Eye, Edit } from 'lucide-react';
import type { PermissionLevel } from '@/types/permissions';

interface PermissionLevelSelectProps {
  value: PermissionLevel;
  onChange: (level: PermissionLevel) => void;
  disabled?: boolean;
}

const PermissionLevelSelect: React.FC<PermissionLevelSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const getPermissionDisplay = (level: PermissionLevel) => {
    switch (level) {
      case 'none':
        return {
          label: 'Sem Acesso',
          icon: Ban,
          variant: 'secondary' as const,
          className: 'text-gray-600'
        };
      case 'view':
        return {
          label: 'Visualização',
          icon: Eye,
          variant: 'outline' as const,
          className: 'text-blue-600'
        };
      case 'edit':
        return {
          label: 'Edição',
          icon: Edit,
          variant: 'default' as const,
          className: 'text-green-600'
        };
      default:
        return {
          label: 'Sem Acesso',
          icon: Ban,
          variant: 'secondary' as const,
          className: 'text-gray-600'
        };
    }
  };

  const currentDisplay = getPermissionDisplay(value);
  const Icon = currentDisplay.icon;

  return (
    <Select
      value={value}
      onValueChange={(newValue) => onChange(newValue as PermissionLevel)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <div className="flex items-center space-x-2">
            <Icon className={`h-4 w-4 ${currentDisplay.className}`} />
            <span className={currentDisplay.className}>
              {currentDisplay.label}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <div className="flex items-center space-x-2">
            <Ban className="h-4 w-4 text-gray-600" />
            <span>Sem Acesso</span>
          </div>
        </SelectItem>
        <SelectItem value="view">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-blue-600" />
            <span>Visualização</span>
          </div>
        </SelectItem>
        <SelectItem value="edit">
          <div className="flex items-center space-x-2">
            <Edit className="h-4 w-4 text-green-600" />
            <span>Edição</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default PermissionLevelSelect;
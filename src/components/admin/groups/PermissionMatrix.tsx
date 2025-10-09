import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, RefreshCw, Monitor } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Screen, ScreenPermission, PermissionLevel, UserGroup } from '@/types/permissions';
import { screenService } from '@/services/screenService';
import { permissionsService } from '@/services/permissionsService';
import PermissionLevelSelect from './PermissionLevelSelect';

interface PermissionMatrixProps {
  group: UserGroup;
  onPermissionsUpdated?: () => void;
}

interface PermissionMatrixItem {
  screen: Screen;
  permissionLevel: PermissionLevel;
  hasChanges: boolean;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  group,
  onPermissionsUpdated,
}) => {
  const { user } = useAuth();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [permissions, setPermissions] = useState<PermissionMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load screens and permissions on component mount or group change
  useEffect(() => {
    loadData();
  }, [group.id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all screens and group permissions in parallel
      const [screensData, groupPermissions] = await Promise.all([
        screenService.getAllScreens(),
        permissionsService.getGroupPermissions(group.id)
      ]);

      // Create permission matrix with current permissions
      const permissionMap = new Map<string, PermissionLevel>();
      groupPermissions.forEach(permission => {
        permissionMap.set(permission.screen_key, permission.permission_level);
      });

      const matrixItems: PermissionMatrixItem[] = screensData.map(screen => ({
        screen,
        permissionLevel: permissionMap.get(screen.key) || 'none',
        hasChanges: false
      }));

      setScreens(screensData);
      setPermissions(matrixItems);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading permission matrix data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (screenKey: string, newLevel: PermissionLevel) => {
    setPermissions(prev => prev.map(item => {
      if (item.screen.key === screenKey) {
        return {
          ...item,
          permissionLevel: newLevel,
          hasChanges: true
        };
      }
      return item;
    }));
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);

      // Prepare permissions data for saving
      const permissionsToSave: Omit<ScreenPermission, 'id' | 'created_at' | 'updated_at'>[] = permissions
        .filter(item => item.permissionLevel !== 'none') // Only save non-none permissions
        .map(item => ({
          group_id: group.id,
          screen_key: item.screen.key,
          permission_level: item.permissionLevel
        }));

      await permissionsService.updateGroupPermissions(group.id, permissionsToSave as ScreenPermission[], user?.id);

      // Reset change tracking
      setPermissions(prev => prev.map(item => ({
        ...item,
        hasChanges: false
      })));
      setHasUnsavedChanges(false);

      // Notify parent component
      onPermissionsUpdated?.();
    } catch (error) {
      console.error('Error saving permissions:', error);
      throw error; // Re-throw to let parent handle the error display
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  // Group screens by category for better organization, excluding 'public' category
  const screensByCategory = screens.reduce((acc, screen) => {
    // Skip screens with 'public' category
    if (screen.category === 'public') {
      return acc;
    }

    if (!acc[screen.category]) {
      acc[screen.category] = [];
    }
    acc[screen.category].push(screen);
    return acc;
  }, {} as Record<string, Screen[]>);

  const getPermissionForScreen = (screenKey: string): PermissionLevel => {
    const item = permissions.find(p => p.screen.key === screenKey);
    return item?.permissionLevel || 'none';
  };

  const hasChangesForScreen = (screenKey: string): boolean => {
    const item = permissions.find(p => p.screen.key === screenKey);
    return item?.hasChanges || false;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Configuração de Permissões</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-8 w-[120px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Configuração de Permissões - {group.name}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSavePermissions}
              disabled={!hasUnsavedChanges || saving}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(screensByCategory).length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tela encontrada</h3>
            <p className="text-gray-500">Não há telas registradas no sistema para configurar permissões.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(screensByCategory).map(([category, categoryScreens]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-sm font-medium">
                    {category}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {categoryScreens.length} tela{categoryScreens.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tela</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Rota</TableHead>
                        <TableHead className="text-center">Nível de Permissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryScreens.map((screen) => (
                        <TableRow key={screen.key}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <span>{screen.name}</span>
                              {hasChangesForScreen(screen.key) && (
                                <Badge variant="secondary" className="text-xs">
                                  Alterado
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {screen.description || 'Sem descrição'}
                          </TableCell>
                          <TableCell className="text-gray-500 font-mono text-sm">
                            {screen.route}
                          </TableCell>
                          <TableCell className="text-center">
                            <PermissionLevelSelect
                              value={getPermissionForScreen(screen.key)}
                              onChange={(level) => handlePermissionChange(screen.key, level)}
                              disabled={saving}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}

            {hasUnsavedChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                  <p className="text-sm text-yellow-800">
                    Você tem alterações não salvas. Clique em "Salvar Alterações" para aplicá-las.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionMatrix;
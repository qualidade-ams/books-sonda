
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent } from '@/components/ui/card';

const Dashboard = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Bem-vindo ao painel administrativo</p>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Sistema Books SND
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Utilize o menu lateral para navegar pelas funcionalidades do sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;

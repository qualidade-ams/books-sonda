
import AdminLayout from '@/components/admin/LayoutAdmin';

const Dashboard = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Bem-vindo ao painel administrativo</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;

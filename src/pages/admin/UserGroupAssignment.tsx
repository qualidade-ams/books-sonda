import AdminLayout from '@/components/admin/LayoutAdmin';
import UserGroupAssignmentTable from '@/components/admin/groups/UserGroupAssignmentTable';

const UserGroupAssignment = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Atribuição de Usuários aos Grupos</h1>
          <p className="text-gray-600">
            Gerencie a atribuição de usuários aos grupos de permissão do sistema
          </p>
        </div>

        

        {/* User Assignment Table */}
        <UserGroupAssignmentTable />
      </div>
    </AdminLayout>
  );
};

export default UserGroupAssignment;
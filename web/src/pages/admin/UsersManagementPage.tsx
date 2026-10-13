import React, { useState } from 'react';
import { UserCheck, Plus, Shield, UserX, Mail, Key, Edit, CheckCircle2, KeyRound, Copy } from 'lucide-react';
import { dbService } from '../../services/db';
import { User, UserRole } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CREDENTIALS } from '../auth/LoginPage';

export const UsersManagementPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>(() => dbService.getUsers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('Procurement');
  const [role, setRole] = useState<UserRole>('PURCHASING_ANALYST');
  const [status, setStatus] = useState<User['status']>('ACTIVE');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  // shown once after a user is created or a password is reset; the server keeps only a hash
  const [handover, setHandover] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const canManage = hasPermission('MANAGE_USERS');

  const openCreateModal = () => {
    setEditingUser(null);
    setEmail('');
    setDisplayName('');
    setDepartment('Procurement Operations');
    setRole('PURCHASING_ANALYST');
    setStatus('ACTIVE');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEmail(user.email);
    setDisplayName(user.displayName);
    setDepartment(user.department);
    setRole(user.role);
    setStatus(user.status);
    setFormError('');
    setIsModalOpen(true);
  };

  const refresh = () => setUsers(dbService.getUsers());

  const handleSaveUser = async () => {
    if (!email.trim() || !displayName.trim()) {
      setFormError('Please provide both full name and email address.');
      return;
    }

    setBusy(true);
    setFormError('');
    try {
      if (editingUser) {
        await dbService.updateUser(editingUser.uid, { displayName: displayName.trim(), department, role });
        if (status !== editingUser.status) await dbService.updateUserStatus(editingUser.uid, status);
      } else {
        const created = await dbService.createUser({ email: email.trim(), displayName: displayName.trim(), department, role });
        setHandover({ email: created.user.email, temporaryPassword: created.temporaryPassword });
      }
      refresh();
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the user.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    const nextStatus: User['status'] = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await dbService.updateUserStatus(u.uid, nextStatus);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not change the status.');
    }
  };

  const handleResetPassword = async (u: User) => {
    if (!window.confirm(`Reset the password of ${u.displayName}? They will have to choose a new one at their next sign-in.`)) return;
    try {
      setHandover(await dbService.resetUserPassword(u.uid));
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not reset the password.');
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'displayName',
      header: 'Full Name / Email',
      sortable: true,
      render: (u) => (
        <div>
          <span className="font-semibold text-slate-900 block">{u.displayName}</span>
          <span className="text-[11px] text-slate-400 font-mono block">{u.email}</span>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (u) => <span className="text-slate-600 text-xs">{u.department}</span>,
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      render: (u) => {
        const roleBadges: Record<UserRole, { label: string; variant: 'purple' | 'primary' | 'info' | 'neutral' }> = {
          PURCHASING_MANAGER: { label: 'Purchasing Manager', variant: 'purple' },
          PURCHASING_ASSISTANT_MANAGER: { label: 'Asst. Manager', variant: 'primary' },
          PURCHASING_ANALYST: { label: 'Purchasing Analyst', variant: 'info' },
          ADMIN: { label: 'System Admin', variant: 'neutral' },
        };
        const conf = roleBadges[u.role] || { label: u.role, variant: 'neutral' };
        return <Badge variant={conf.variant}>{conf.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Account Status',
      sortable: true,
      align: 'center',
      render: (u) => (
        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>
          {u.status}
        </Badge>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Active',
      sortable: true,
      className: 'font-mono text-xs text-slate-500',
      render: (u) => u.lastLoginAt ? u.lastLoginAt.split('T')[0] : 'Never',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditModal(u)}
            icon={<Edit className="w-3 h-3" />}
          >
            Edit
          </Button>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => handleResetPassword(u)} icon={<Key className="w-3 h-3" />}>
              Reset password
            </Button>
          )}
          {canManage && u.uid !== currentUser?.uid && (
            <Button
              size="sm"
              variant={u.status === 'ACTIVE' ? 'ghost' : 'outline'}
              onClick={() => handleToggleStatus(u)}
              className={u.status === 'ACTIVE' ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600'}
            >
              {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Enterprise User Directory & Access Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authorized procurement personnel, role assignments, and security lifecycle.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Authorized User
          </Button>
        )}
      </div>

      {/* Role Credentials Reference Strip */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 text-white space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#44B330]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Roles Available in This System
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Each person signs in with their own email and password; the role decides what they can do
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLE_CREDENTIALS.map((cred) => (
            <div 
              key={cred.role}
              className={`rounded-lg bg-slate-800/80 border p-3 border-l-4 ${cred.accentBg} border-slate-700/80 space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cred.badgeColor}`}>
                  {cred.roleTitle}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-100 truncate">
                {cred.name}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{cred.description}</p>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Search users by name, email, department or role..."
        searchableKey={(u) => `${u.displayName} ${u.email} ${u.department} ${u.role}`}
        pageSize={10}
      />

      {/* Role-Based Access Control (RBAC) Entitlement Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Enterprise Role Entitlement & Security Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Granular access control enforcing segregation of duties across procurement workflows.
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold text-[#002F87] bg-[#EFF4FC] border border-[#DBE8FC] px-2.5 py-1 rounded-md">
            RBAC Policy v2.4 Enforced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Functional Capability / Scope</th>
                <th className="py-2.5 px-3 text-center">Purchasing Manager</th>
                <th className="py-2.5 px-3 text-center">Purchasing Asst. Manager</th>
                <th className="py-2.5 px-3 text-center">Purchasing Analyst</th>
                <th className="py-2.5 px-3 text-center">System Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-medium">Executive Dashboard & High-Level KPIs</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Supplier & Material Catalog Editing</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">Read Only</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">Read Only</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full CRUD</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full CRUD</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Purchase Order Issuance & Editing</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">Read Only</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">Read Only</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full CRUD</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full CRUD</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Batch Data Ingestion & Quality Audits</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">—</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">—</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Upload & Clean</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full CRUD</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Operational Alert Acknowledgment & Resolution</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Sign-Off</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Investigate</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Triage</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full Override</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Performance Scoring Weights & Tolerance Thresholds</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Configurable</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">Read Only</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">Read Only</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full Config</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">User Directory, Credentials & Access Lifecycle</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">—</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">—</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">—</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full Admin</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Regulatory Audit Logs & Disaster Recovery Snapshots</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ View Logs</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ View Logs</td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">—</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Backup & Restore</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Temporary password: shown once */}
      {handover && (
        <Modal isOpen onClose={() => setHandover(null)} title="Temporary password" subtitle="Give this to the person now. It is not stored anywhere and cannot be shown again." maxWidth="md">
          <div className="space-y-4 text-xs text-slate-700">
            <div>
              <span className="text-slate-500 block mb-1">Sign-in email</span>
              <span className="font-mono font-semibold text-slate-900">{handover.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Temporary password</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-wider text-slate-900">{handover.temporaryPassword}</code>
                <Button variant="outline" size="sm" icon={<Copy className="w-3 h-3" />} onClick={() => navigator.clipboard?.writeText(handover.temporaryPassword)}>
                  Copy
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">They will be asked to choose their own password the first time they sign in.</p>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="primary" size="sm" onClick={() => setHandover(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* User Create / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? `Edit User: ${editingUser.displayName}` : 'Create New Authorized User'}
          subtitle="Assign roles and configure enterprise RBAC permissions."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Full Legal Name *</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Maria Clara Santos"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Corporate Email Address *</label>
              <input
                type="email"
                value={email}
                disabled={!!editingUser}
                onChange={e => setEmail(e.target.value)}
                placeholder="username@ipi.ph"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Department / Division</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Strategic Procurement / Quality Assurance"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Role Assignment *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
                >
                  <option value="PURCHASING_MANAGER">Purchasing Manager</option>
                  <option value="PURCHASING_ASSISTANT_MANAGER">Purchasing Asst. Manager</option>
                  <option value="PURCHASING_ANALYST">Purchasing Analyst</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Account Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as User['status'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-[#EFF4FC] border border-[#DBE8FC] rounded-lg space-y-1">
              <span className="font-semibold text-[#002F87] block">RBAC Scope for {role}:</span>
              <p className="text-[11px] text-slate-700">
                {role === 'PURCHASING_MANAGER' && 'Full dashboard visibility, supplier rankings, contract review, export reports, and scoring weight configuration.'}
                {role === 'PURCHASING_ASSISTANT_MANAGER' && 'Supplier metrics review, price anomaly investigation, operational alert resolution, and reporting.'}
                {role === 'PURCHASING_ANALYST' && 'Data ingestion, supplier & material catalog management, PO creation, validation review, and analytics.'}
                {role === 'ADMIN' && 'Full system configuration, user lifecycle administration, and audit logs.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveUser} disabled={busy}>
                {busy ? 'Saving…' : editingUser ? 'Save User' : 'Create User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

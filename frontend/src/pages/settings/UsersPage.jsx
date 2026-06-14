import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompanyUsers, inviteUser } from '../../api/users.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/ui/Pagination';

const ROLES = [
  { value: 'SALES_USER',          label: 'Sales User',          desc: 'Create & manage sales orders' },
  { value: 'PURCHASE_USER',       label: 'Purchase User',       desc: 'Create & manage purchase orders' },
  { value: 'MANUFACTURING_USER',  label: 'Manufacturing User',  desc: 'Manage production & work orders' },
  { value: 'INVENTORY_MANAGER',   label: 'Inventory Manager',   desc: 'Full inventory & stock visibility' },
  { value: 'BUSINESS_OWNER',      label: 'Business Owner',      desc: 'Read access to all modules + audit' },
];

const UsersPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SALES_USER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Get paginated company users
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['company-users', page, searchQuery],
    queryFn: () => getCompanyUsers({
      page,
      limit: 10,
      search: searchQuery,
    }),
  });

  const users = responseData?.data || [];
  const pagination = responseData?.pagination;

  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setSuccess(res.data?.message || 'User invited successfully!');
      setName('');
      setEmail('');
      setRole('SALES_USER');
      setError('');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to invite user.');
      setSuccess('');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !role) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    inviteMutation.mutate({ name, email, role }, {
      onSettled: () => setLoading(false),
    });
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage);
    setSearchParams(params);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    const params = new URLSearchParams(window.location.search);
    params.set('page', '1');
    setSearchParams(params);
  };

  const getRoleLabel = (r) => {
    const found = ROLES.find(x => x.value === r) || { label: r };
    return found.label;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px', alignItems: 'start' }}>
      
      {/* Column 1: Invite User Form */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Invite Team Member</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Send an onboarding email containing a temporary password.
          </p>
        </div>

        {error && (
          <div className="animate-shake" style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} id="invite-form">
          <Input
            id="invite-name"
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); setSuccess(''); }}
          />

          <Input
            id="invite-email"
            label="Email Address"
            type="email"
            placeholder="john.doe@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess(''); }}
          />

          <div style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Role</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${role === r.value ? 'rgba(255,84,14,0.5)' : 'var(--border)'}`,
                    background: role === r.value ? 'var(--accent-light)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: role === r.value ? 'var(--accent)' : 'var(--text-primary)',
                    marginBottom: '2px',
                  }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            id="btn-invite-submit"
            type="submit"
            loading={loading}
            style={{ width: '100%', background: '#FF540E' }}
          >
            Send Invite
          </Button>
        </form>
      </div>

      {/* Column 2: Users Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Team Directory</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Users registered in this tenant.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '13.5px',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF540E';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,84,14,0.12)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#EF4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <Loader padding="40px 0" size={28} />
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ margin: '0 auto 10px', color: 'var(--text-muted)' }} />
            <p style={{ marginTop: '10px', fontSize: '14px' }}>No users found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge badge-muted" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td>
                      {u.mustChangePassword ? (
                        <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                          Must Reset Password
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                limit={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default UsersPage;

import { useAuthStore } from '../store/authStore';

/**
 * Returns the current user's role and helper booleans.
 * Usage: const { role, isAdmin, isSalesUser } = useRole();
 */
export const useRole = () => {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? null;

  return {
    role,
    isAdmin:             role === 'ADMIN',
    isBusinessOwner:     role === 'BUSINESS_OWNER',
    isSalesUser:         role === 'SALES_USER',
    isPurchaseUser:      role === 'PURCHASE_USER',
    isManufacturingUser: role === 'MANUFACTURING_USER',
    isInventoryManager:  role === 'INVENTORY_MANAGER',
    hasRole: (...roles) => roles.includes(role),
  };
};

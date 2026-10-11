import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Polls the seller's own orders and toasts when their status changes to
// cancelled/delivered (replaces the old Supabase realtime subscription).
export const useOrderStatusNotifications = () => {
  const { user } = useAuth();
  const knownStatuses = useRef<Map<string, string>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    if (!user) return;

    const checkOrders = async () => {
      try {
        const orders = await api.orders.list();
        const ownOrders = orders.filter((o: any) => o.seller_id === user.id);

        if (!initialized.current) {
          for (const order of ownOrders) {
            knownStatuses.current.set(order.id, order.status);
          }
          initialized.current = true;
          return;
        }

        for (const order of ownOrders) {
          const previousStatus = knownStatuses.current.get(order.id);
          if (previousStatus && previousStatus !== order.status) {
            if (order.status === 'cancelled') {
              toast.error(`🚫 Zakaz #${order.order_number} bekor qilindi!`, {
                description: `Mijoz: ${order.customer_name}`,
                duration: 10000,
              });
            } else if (order.status === 'delivered') {
              toast.success(`✅ Zakaz #${order.order_number} tasdiqlandi!`, {
                description: `Mijoz: ${order.customer_name}`,
                duration: 10000,
              });
            }
          }
          knownStatuses.current.set(order.id, order.status);
        }
      } catch (error) {
        console.error('Error checking order status changes:', error);
      }
    };

    checkOrders();
    const interval = setInterval(checkOrders, 30000);
    return () => clearInterval(interval);
  }, [user]);
};

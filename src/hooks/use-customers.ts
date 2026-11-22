/**
 * useApiCustomers — fetches the owner's customer list from the backend.
 * Used by confirmed owners instead of the local mock seed.
 */
import { useCallback, useEffect, useState } from "react";
import { getCustomers, createCustomer } from "@/services/receivables";
import type { Customer } from "@/types/pos";

export function useApiCustomers(ownerId: string | undefined) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    setLoading(true);
    getCustomers()
      .then((data) => { if (active) setCustomers(data); })
      .catch(() => { if (active) setCustomers([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ownerId, revision]);

  const refresh = useCallback(() => setRevision((v) => v + 1), []);

  const addCustomer = useCallback(async (name: string): Promise<Customer> => {
    const customer = await createCustomer(name);
    setRevision((v) => v + 1);
    return customer;
  }, []);

  return { customers, loading, refresh, addCustomer };
}

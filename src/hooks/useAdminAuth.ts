import { useEffect, useState } from "react";
import { account } from "../services/appwrite";

export function useAdminAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    account
      .get()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
    const u = await account.get();
    setUser(u);
    return u;
  };

  const logout = async () => {
    await account.deleteSession("current");
    setUser(null);
  };

  return { user, loading, login, logout };
}
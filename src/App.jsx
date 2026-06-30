import { useEffect, useState } from "react";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import { supabase } from "./lib/supabase";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <main className="app-shell">Loading...</main>;
  }

  return session ? <Dashboard session={session} /> : <AuthPage />;
}

export default App;

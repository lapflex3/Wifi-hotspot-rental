import { useEffect, useState } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AdminDashboard from './components/AdminDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import Login from './components/Login';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check admin status
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        const isUserAdmin = adminDoc.exists() || currentUser.email === 'laptoprazif@gmail.com';
        setIsAdmin(isUserAdmin);
        
        // Bootstrap admin if it's the specified email
        if (currentUser.email === 'laptoprazif@gmail.com' && !adminDoc.exists()) {
          await setDoc(doc(db, 'admins', currentUser.uid), { email: currentUser.email });
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <CustomerDashboard user={user} />;
}

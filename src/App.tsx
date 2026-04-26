import { useEffect, useState } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AdminDashboard from './components/AdminDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import Login from './components/Login';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        const whiteList = ['laptoprazif@gmail.com', 'lapflex100@gmail.com', 'razifmake@gmail.com'];
        const isWhiteListed = whiteList.includes(currentUser.email);
        
        try {
          // Check admin status from DB or whitelist
          const adminPath = `admins/${currentUser.uid}`;
          const adminDoc = await getDoc(doc(db, adminPath)).catch(e => handleFirestoreError(e, OperationType.GET, adminPath));
          
          const isUserAdmin = (adminDoc && adminDoc.exists()) || isWhiteListed;
          setIsAdmin(isUserAdmin);
          
          // Auto-provision admin access for whitelisted emails
          if (isWhiteListed && (!adminDoc || !adminDoc.exists())) {
            await setDoc(doc(db, adminPath), { 
              email: currentUser.email,
              role: 'super-admin',
              createdAt: new Date().toISOString()
            }).catch(e => handleFirestoreError(e, OperationType.WRITE, adminPath));
          }
        } catch (err) {
          console.error("Initialization error:", err);
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-dark technical-grid">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-brand/10 border-t-brand rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/5 border-b-brand/40 rounded-full animate-spin-reverse"></div>
            </div>
        </div>
        <p className="mt-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] animate-pulse">Initializing Systems...</p>
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

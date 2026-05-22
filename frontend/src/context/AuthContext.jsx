import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, authService } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    if (auth) {
      // Firebase configured: Escuchar cambios de sesión de forma segura
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    } else {
      // Fallback local (si Firebase no está configurado)
      const storedUser = sessionStorage.getItem('authUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loginUser = (userData) => {
    // Solo se necesita actualizar el estado manualmente para el fallback local.
    // Con Firebase, `onAuthStateChanged` lo hace automáticamente.
    if (!auth) {
      setUser(userData);
      sessionStorage.setItem('authUser', JSON.stringify(userData));
    }
  };

  const logout = async () => {
    try {
      if (auth) {
        await authService.logout();
      } else {
        setUser(null);
        sessionStorage.removeItem('authUser');
      }
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

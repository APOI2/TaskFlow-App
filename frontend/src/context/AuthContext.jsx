import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Para simplificar, el login se persiste en sessionStorage o localStorage 
    // en lugar de Firebase Auth, para enfocarnos en los datos de proyectos.
    const storedUser = sessionStorage.getItem('authUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (name, role) => {
    // Generamos un ID pseudo-aleatorio para el usuario
    const newUser = {
      id: Math.random().toString(36).substring(2, 10),
      name,
      role
    };
    setUser(newUser);
    sessionStorage.setItem('authUser', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('authUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

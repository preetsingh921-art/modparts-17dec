import { createContext, useContext, useState, useEffect } from 'react';

const LogoContext = createContext();

export const useLogo = () => {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
};

export const LogoProvider = ({ children }) => {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const response = await fetch('/api/admin/site-config');
      const data = await response.json();
      
      if (data.success && data.config.logo) {
        setLogo(data.config.logo);
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLogo = (newLogo) => {
    setLogo(newLogo);
  };

  const value = {
    logo,
    loading,
    updateLogo,
    refreshLogo: fetchLogo
  };

  return (
    <LogoContext.Provider value={value}>
      {children}
    </LogoContext.Provider>
  );
};

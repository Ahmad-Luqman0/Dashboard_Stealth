import React, { createContext, useContext, useState, useCallback } from 'react';

interface ExportContextType {
  registerExportHandler: (handler: () => void) => void;
  triggerExport: () => void;
}

const ExportContext = createContext<ExportContextType | undefined>(undefined);

export const ExportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exportHandler, setExportHandler] = useState<(() => void) | null>(null);

  const registerExportHandler = useCallback((handler: () => void) => {
    setExportHandler(() => handler);
  }, []);

  const triggerExport = useCallback(() => {
    if (exportHandler) {
      exportHandler();
    } else {
      console.warn("No export handler registered for this page.");
    }
  }, [exportHandler]);

  return (
    <ExportContext.Provider value={{ registerExportHandler, triggerExport }}>
      {children}
    </ExportContext.Provider>
  );
};

export const useExport = () => {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error('useExport must be used within an ExportProvider');
  }
  return context;
};

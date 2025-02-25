import { createContext, useContext, useRef } from "react";

type BannerContextType = {
  containerRef: React.RefObject<HTMLDivElement>;
};

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <BannerContext.Provider value={{ containerRef }}>
      {children}
    </BannerContext.Provider>
  );
};

export const useBanner = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error("useBanner must be used within a BannerProvider");
  }
  return context;
};

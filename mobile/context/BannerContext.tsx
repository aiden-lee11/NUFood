import React, { createContext, useContext, useState } from 'react';

type BannerType = 'success' | 'error' | 'warning' | 'info';

interface Banner {
    message: string;
    type: BannerType;
}

interface BannerContextType {
    banner: Banner | null;
    showBanner: (message: string, type: BannerType) => void;
    hideBanner: () => void;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export function BannerProvider({ children }: { children: React.ReactNode }) {
    const [banner, setBanner] = useState<Banner | null>(null);

    const showBanner = (message: string, type: BannerType) => {
        setBanner({ message, type });
    };

    const hideBanner = () => {
        setBanner(null);
    };

    return (
        <BannerContext.Provider value={{ banner, showBanner, hideBanner }}>
            {children}
        </BannerContext.Provider>
    );
}

export function useBanner() {
    const context = useContext(BannerContext);
    if (context === undefined) {
        throw new Error('useBanner must be used within a BannerProvider');
    }
    return context;
} 
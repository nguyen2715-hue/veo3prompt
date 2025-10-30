import React from 'react';
import { useLocalization } from '../hooks/useLocalization';

const Loader: React.FC = () => {
    const { t } = useLocalization();

    return (
        <div className="absolute inset-0 bg-surface/80 flex flex-col items-center justify-center z-10 rounded-lg p-4 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-text-secondary font-semibold">{t('loader.text')}</p>
        </div>
    );
};

export default Loader;

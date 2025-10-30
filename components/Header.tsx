import React from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { SettingsIcon, CodeIcon } from './icons';

interface HeaderProps {
    onApiSettingsClick: () => void;
    onDownloadCodeClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onApiSettingsClick, onDownloadCodeClick }) => {
  const { t } = useLocalization();
  return (
    <header className="bg-surface p-4 shadow-sm border-b border-border-color relative">
      <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold text-primary uppercase">{t('header.title')}</h1>
          <p className="text-text-secondary mt-1">{t('header.subtitle')}</p>
      </div>
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-2">
        <button
            onClick={onDownloadCodeClick}
            className="flex items-center gap-2 bg-surface hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-text-secondary font-medium py-2 px-3 rounded-full border border-border-color transition-colors"
            aria-label={t('header.downloadCode')}
        >
            <CodeIcon className="w-5 h-5" />
        </button>
        <button
            onClick={onApiSettingsClick}
            className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary font-semibold py-2 px-3 rounded-full hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
            aria-label={t('header.apiSettings')}
        >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-sm">{t('header.apiSettings')}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

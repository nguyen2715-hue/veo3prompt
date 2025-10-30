import React, { useState, useRef } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { DocumentAddIcon, TrashIcon, CheckIcon } from './icons';

interface ApiKeyListProps {
    id: string;
    label: string;
    placeholder: string;
    keys: string[];
    onKeysChange: (keys: string[]) => void;
    onTestKey: (key: string) => Promise<any>;
    onTestSuccess?: (key: string, details: any) => void;
    renderKeyDetails?: (details: any) => React.ReactNode;
}

const ApiKeyList: React.FC<ApiKeyListProps> = ({ id, label, placeholder, keys, onKeysChange, onTestKey, onTestSuccess, renderKeyDetails }) => {
    const { t } = useLocalization();
    const [newKey, setNewKey] = useState('');
    const [testStatuses, setTestStatuses] = useState<Record<number, { status: 'idle' | 'testing' | 'success' | 'error', message: string | null, details: any | null }>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddKey = () => {
        if (newKey.trim() && !keys.includes(newKey.trim())) {
            onKeysChange([...keys, newKey.trim()]);
            setNewKey('');
        }
    };

    const handleRemoveKey = (indexToRemove: number) => {
        onKeysChange(keys.filter((_, index) => index !== indexToRemove));
        const newStatuses = { ...testStatuses };
        delete newStatuses[indexToRemove];
        setTestStatuses(newStatuses);
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const importedKeys = text.split('\n').map(k => k.trim()).filter(Boolean);
                const uniqueNewKeys = importedKeys.filter(k => !keys.includes(k));
                onKeysChange([...keys, ...uniqueNewKeys]);
            };
            reader.readAsText(file);
        }
        // Reset file input to allow importing the same file again
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleTestKey = async (key: string, index: number) => {
        setTestStatuses(prev => ({ ...prev, [index]: { status: 'testing', message: null, details: null } }));
        try {
            const details = await onTestKey(key);
            setTestStatuses(prev => ({ ...prev, [index]: { status: 'success', message: t('apiSettings.connectionSuccessful'), details } }));
            if (onTestSuccess) {
                onTestSuccess(key, details);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setTestStatuses(prev => ({ ...prev, [index]: { status: 'error', message: `${t('apiSettings.connectionFailed')} ${errorMessage}`, details: null } }));
        }
    };

    const handleTestAll = () => {
        keys.forEach((key, index) => {
            handleTestKey(key, index);
        });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-md font-semibold text-text-main">{label}</h3>
            <div className="space-y-2">
                {keys.map((key, index) => (
                    <div key={index} className="p-2 bg-brand-bg rounded-md border border-border-color/70">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-text-secondary flex-grow truncate">...{key.slice(-8)}</span>
                            <button onClick={() => handleTestKey(key, index)} className="text-xs font-semibold text-primary hover:underline disabled:text-text-secondary/50" disabled={testStatuses[index]?.status === 'testing'}>{testStatuses[index]?.status === 'testing' ? t('apiSettings.testing') : t('apiSettings.testConnection')}</button>
                            <button onClick={() => handleRemoveKey(index)} className="text-error hover:text-error-hover"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                        {testStatuses[index] && testStatuses[index].status !== 'testing' && testStatuses[index].message && (
                             <p className={`mt-1 text-xs font-medium flex items-center gap-1 ${testStatuses[index].status === 'success' ? 'text-success' : 'text-error'}`}>
                                {testStatuses[index].status === 'success' && <CheckIcon className="w-3 h-3" />}
                                <span>{testStatuses[index].message}</span>
                            </p>
                        )}
                        {testStatuses[index]?.status === 'success' && renderKeyDetails && testStatuses[index].details && (
                           <div className="mt-1 pt-1 border-t border-border-color/50">
                             {renderKeyDetails(testStatuses[index].details)}
                           </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={placeholder}
                    className="flex-grow bg-surface border border-border-color rounded-md px-3 py-1.5 focus:ring-primary focus:border-primary transition text-sm"
                />
                <button onClick={handleAddKey} className="px-4 py-1.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-hover">{t('apiSettings.addKey')}</button>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 text-sm bg-surface hover:bg-gray-100 dark:hover:bg-gray-700 border border-border-color py-2 rounded-md transition-colors">
                    <DocumentAddIcon className="w-5 h-5"/>
                    {t('apiSettings.importFromFile')}
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".txt" />
                 <button onClick={handleTestAll} className="flex-1 text-sm bg-surface hover:bg-gray-100 dark:hover:bg-gray-700 border border-border-color py-2 rounded-md transition-colors font-semibold" disabled={keys.length === 0}>
                    {t('apiSettings.testAll')}
                 </button>
            </div>
        </div>
    );
};

export default ApiKeyList;
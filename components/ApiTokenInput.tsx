import React, { useState } from 'react';
import { LockIcon, CheckIcon } from './icons'; // Assuming CheckIcon is also in icons.tsx
import { useLocalization } from '../hooks/useLocalization';

export type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface ApiTokenInputProps {
  id: string;
  label: string;
  placeholder: string;
  token: string;
  setToken: (token: string) => void;
  onTestConnection: () => Promise<void>;
  extraInfo?: React.ReactNode;
}

const ApiTokenInput: React.FC<ApiTokenInputProps> = ({ 
  id, 
  label, 
  placeholder, 
  token, 
  setToken,
  onTestConnection,
  extraInfo,
}) => {
  const { t } = useLocalization();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const handleTest = async () => {
      setTestStatus('testing');
      setTestMessage(null);
      try {
          await onTestConnection();
          setTestStatus('success');
          setTestMessage(t('apiSettings.connectionSuccessful'));
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setTestStatus('error');
          setTestMessage(`${t('apiSettings.connectionFailed')} ${errorMessage}`);
      }
  }

  const getStatusColor = () => {
    switch(testStatus) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-text-secondary';
    }
  }

  return (
    <div>
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
          {label}
        </label>
        <button
          type="button"
          onClick={handleTest}
          disabled={!token || testStatus === 'testing'}
          className="text-sm font-semibold text-primary hover:text-primary-hover disabled:text-text-secondary/50 disabled:cursor-not-allowed transition-colors"
        >
          {testStatus === 'testing' ? t('apiSettings.testing') : t('apiSettings.testConnection')}
        </button>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <LockIcon className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>
        <input
          id={id}
          type={isPasswordVisible ? 'text' : 'password'}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-brand-bg border border-border-color rounded-md pl-10 pr-10 py-2 focus:ring-primary focus:border-primary transition"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <button
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            className="text-text-secondary hover:text-text-main"
            aria-label={isPasswordVisible ? "Ẩn token" : "Hiện token"}
          >
            {isPasswordVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.97 9.97 0 01-1.563 3.029m-2.176 1.822l-3.29 3.29" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
      </div>
       {testStatus !== 'idle' && testStatus !== 'testing' && testMessage && (
        <p className={`mt-2 text-sm font-medium flex items-center gap-1.5 ${getStatusColor()}`}>
            {testStatus === 'success' && <CheckIcon className="w-4 h-4" />}
            {testStatus === 'error' && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            <span>{testMessage}</span>
        </p>
      )}
      {extraInfo}
    </div>
  );
};

export default ApiTokenInput;
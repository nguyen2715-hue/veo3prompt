import React, { useRef, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';

interface ConsoleLogProps {
    messages: string[];
}

const ConsoleLog: React.FC<ConsoleLogProps> = ({ messages }) => {
    const { t } = useLocalization();
    const logEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);
    
    if (messages.length === 0) {
        return null; // Don't render anything if there are no messages
    }

    return (
        <div className="w-full bg-gray-900 dark:bg-black/50 rounded-lg shadow-lg p-3 text-left">
            <h4 className="text-sm font-semibold text-white mb-2 border-b border-gray-600 pb-1">{t('console.title')}</h4>
            <div className="h-32 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {messages.map((msg, index) => (
                    <p key={index} className={`font-mono text-xs mb-1 ${msg.includes('[LỖI]') ? 'text-red-400' : 'text-green-400'}`}>
                        <span className="select-none">{`> `}</span>{msg}
                    </p>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
};

export default ConsoleLog;

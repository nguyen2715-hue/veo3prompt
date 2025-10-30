import React from 'react';
import type { ProjectSnapshot } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { TrashIcon } from './icons';

interface SnapshotManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  snapshots: ProjectSnapshot[];
  onLoadSnapshot: (snapshot: ProjectSnapshot) => void;
  onDeleteSnapshot: (timestamp: number) => void;
}

const SnapshotManagerModal: React.FC<SnapshotManagerModalProps> = ({
  isOpen,
  onClose,
  projectName,
  snapshots,
  onLoadSnapshot,
  onDeleteSnapshot,
}) => {
  const { t } = useLocalization();

  if (!isOpen) return null;

  const handleDelete = (snapshot: ProjectSnapshot) => {
    if (window.confirm(t('snapshot.confirmDelete', { snapshotName: snapshot.name }))) {
      onDeleteSnapshot(snapshot.timestamp);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border-color"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-xl font-bold text-text-main truncate pr-4" title={projectName}>
            {t('snapshot.title', { projectName })}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-main transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {snapshots.length === 0 ? (
            <p className="text-center text-text-secondary py-8">{t('snapshot.noSnapshots')}</p>
          ) : (
            <ul className="space-y-3">
              {snapshots
                .slice() // Create a copy to avoid mutating the original array
                .sort((a, b) => b.timestamp - a.timestamp) // Show newest first
                .map((snapshot) => (
                  <li
                    key={snapshot.timestamp}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-brand-bg rounded-md border border-border-color gap-3"
                  >
                    <div>
                      <p className="font-semibold text-text-main">{snapshot.name}</p>
                      <p className="text-xs text-text-secondary">
                        {new Date(snapshot.timestamp).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onLoadSnapshot(snapshot)}
                        className="text-sm bg-blue-100 dark:bg-primary/20 text-primary font-semibold py-1.5 px-3 rounded-md hover:bg-blue-200 dark:hover:bg-primary/30 transition-colors"
                      >
                        {t('snapshot.load')}
                      </button>
                      <button
                        onClick={() => handleDelete(snapshot)}
                        className="p-2 bg-error/10 text-error rounded-md hover:bg-error/20 transition-colors"
                        title={t('snapshot.delete')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnapshotManagerModal;
import React, { useState, useEffect, useRef } from 'react';
import { BatchRunState, BatchProjectStatus, BatchProjectStatusState } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from './icons';

// Component to render the status icon
const StatusIcon: React.FC<{ status: BatchProjectStatusState }> = ({ status }) => {
    switch (status) {
        case 'completed':
            return <CheckCircleIcon className="w-5 h-5 text-success" />;
        case 'error':
            return <XCircleIcon className="w-5 h-5 text-error" />;
        case 'processing':
            return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>;
        case 'pending':
        default:
            return <ClockIcon className="w-5 h-5 text-text-secondary" />;
    }
};

// Helper function to format seconds into MM:SS
const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};


const BatchStatusDisplay: React.FC<{ batchRunState: BatchRunState }> = ({ batchRunState }) => {
    const { t } = useLocalization();
    const [elapsedTime, setElapsedTime] = useState(0);
    const { projects, overall, startTime } = batchRunState;

    const projectDurationsRef = useRef<number[]>([]);
    const lastCompletionTimeRef = useRef<number>(0);
    const prevProjectsRef = useRef<BatchProjectStatus[]>([]);

    useEffect(() => {
        const prevProjects = prevProjectsRef.current;
        const currentProjects = projects;
        
        if (prevProjects && elapsedTime > 0) {
            const newlyCompletedProject = currentProjects.find(p => {
                const prevProject = prevProjects.find(prev => prev.rowIndex === p.rowIndex);
                return prevProject?.status === 'processing' && (p.status === 'completed' || p.status === 'error');
            });
            
            if (newlyCompletedProject) {
                const projectDuration = elapsedTime - lastCompletionTimeRef.current;
                projectDurationsRef.current.push(projectDuration);
                lastCompletionTimeRef.current = elapsedTime;
            }
        }

        prevProjectsRef.current = projects;
    }, [projects, elapsedTime]);
    
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime((Date.now() - startTime) / 1000);
        }, 1000);

        return () => clearInterval(timer);
    }, [startTime]);

    const completedCount = projects.filter(p => p.status === 'completed' || p.status === 'error').length;
    const remainingProjects = overall.total - completedCount;
    const progressPercentage = overall.total > 0 ? (completedCount / overall.total) * 100 : 0;
    
    const calculateEtr = () => {
        if (remainingProjects <= 0) return 0;

        const MOVING_AVERAGE_WINDOW = 5;
        const recentDurations = projectDurationsRef.current.slice(-MOVING_AVERAGE_WINDOW);
        
        let averageTimePerProject = 0;

        if (recentDurations.length > 0) {
            averageTimePerProject = recentDurations.reduce((acc, duration) => acc + duration, 0) / recentDurations.length;
        } 
        else if (completedCount > 0) {
            averageTimePerProject = elapsedTime / completedCount;
        }

        return averageTimePerProject > 0 ? remainingProjects * averageTimePerProject : Infinity;
    };

    const etrSeconds = calculateEtr();

    const ProjectRow: React.FC<{ project: BatchProjectStatus }> = ({ project }) => {
        const [isErrorExpanded, setIsErrorExpanded] = useState(false);
        return (
            <li className="p-3 border-b border-border-color last:border-b-0">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-1">
                        <StatusIcon status={project.status} />
                    </div>
                    <div className="flex-grow">
                        <p className="font-semibold text-text-main">{project.name}</p>
                        <p className="text-sm text-text-secondary">{project.message}</p>
                        {project.error && (
                             <div>
                                <button
                                    onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                                    className="text-xs text-error hover:underline mt-1"
                                >
                                    {isErrorExpanded ? t('batchStatus.hideError') : t('batchStatus.showError')}
                                </button>
                                {isErrorExpanded && (
                                    <pre className="mt-1 p-2 bg-error/10 text-error text-xs rounded-md whitespace-pre-wrap font-mono break-all">
                                        <code>{project.error}</code>
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </li>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Overall Progress */}
            <div className="mb-4 p-4 bg-brand-bg rounded-lg border border-border-color">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-text-main">{t('batchStatus.progress')}</span>
                    <span className="text-sm font-bold text-primary">{completedCount} / {overall.total}</span>
                </div>
                <div className="w-full bg-surface border border-border-color rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-xs text-text-secondary mt-2">
                    <span>{t('batchStatus.elapsedTime')}: {formatTime(elapsedTime)}</span>
                    <span>{t('batchStatus.etr')}: {formatTime(etrSeconds)}</span>
                </div>
            </div>

            {/* Project List */}
            <div className="flex-grow border border-border-color rounded-lg overflow-hidden">
                <ul className="h-full overflow-y-auto">
                    {projects.map(p => <ProjectRow key={p.rowIndex} project={p} />)}
                </ul>
            </div>
        </div>
    );
};

export default BatchStatusDisplay;
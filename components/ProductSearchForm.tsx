import React, { useState, useCallback } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { ProductSearchResult } from '../types';
import * as geminiService from '../services/geminiService';
import { UploadIcon } from './icons';

interface ProductSearchFormProps {
    geminiTokens: string[];
    onProductsFound: (productNames: string[]) => void;
}

const ProductSearchForm: React.FC<ProductSearchFormProps> = ({ geminiTokens, onProductsFound }) => {
    const { t } = useLocalization();
    const [products, setProducts] = useState<ProductSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [fileName, setFileName] = useState('');
    const [finalMessage, setFinalMessage] = useState<string | null>(null);

    const parseCSV = (text: string): ProductSearchResult[] => {
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) return [];

        const header = rows[0].split(',').map(h => h.trim());
        const productIndex = header.findIndex(h => h.toLowerCase().includes('sản phẩm'));
        const storeIndex = header.findIndex(h => h.toLowerCase().includes('cửa hàng'));

        if (productIndex === -1 || storeIndex === -1) {
            alert("File CSV phải chứa tiêu đề cột 'Sản phẩm' và 'Cửa hàng'.");
            return [];
        }

        // FIX: Explicitly typed the return value of the map callback to `ProductSearchResult` to prevent TypeScript from incorrectly widening the type of the 'status' property to a generic string.
        return rows.slice(1).map((row, index): ProductSearchResult => {
            const columns = row.split(',');
            return {
                id: index,
                name: columns[productIndex]?.trim() || '',
                store: columns[storeIndex]?.trim() || '',
                status: 'idle',
            };
        }).filter(p => p.name);
    };

    const handleFileChange = (file: File | null) => {
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const parsedProducts = parseCSV(text);
                setProducts(parsedProducts);
            };
            reader.readAsText(file, 'UTF-8');
        }
    };
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleStartSearch = async () => {
        setIsSearching(true);
        setFinalMessage(null);

        // Set all to loading first for immediate UI feedback
        setProducts(prev => prev.map(p => ({ ...p, status: 'loading', error: undefined })));

        // Use Promise.allSettled to ensure all promises complete, even if some fail
        const results = await Promise.allSettled(
            products.map(p => geminiService.findProductImageUrls(p.name, p.store, geminiTokens))
        );

        // Update state based on the results after all have completed
        setProducts(prev => prev.map((product, index) => {
            const result = results[index];
            if (result.status === 'fulfilled') {
                return { ...product, status: 'done', foundImageUrls: result.value };
            } else {
                console.error(`Error searching for ${product.name}:`, result.reason);
                const errorMessage = result.reason instanceof Error ? result.reason.message : "Unknown error";
                return { ...product, status: 'error', error: errorMessage };
            }
        }));

        setIsSearching(false);
    };

    const handleUseProducts = () => {
        const productNames = products.map(p => p.name);
        navigator.clipboard.writeText(productNames.join('\n')).then(() => {
            setFinalMessage(t('productSearch.final.copied'));
            setTimeout(() => setFinalMessage(null), 3000);
        });
        onProductsFound(productNames);
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-text-main">{t('productSearch.title')}</h3>
            
            {/* 1. File Upload */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">{t('productSearch.upload.label')}</label>
                <div 
                    className="flex flex-col items-center justify-center p-6 border-2 border-border-color border-dashed rounded-md bg-brand-bg/50"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <UploadIcon className="w-12 h-12 text-text-secondary/50" />
                    <p className="mt-2 text-sm text-text-secondary">
                        {t('productSearch.upload.instruction')}{' '}
                        <label htmlFor="csv-upload" className="font-medium text-primary hover:underline cursor-pointer">
                            {t('productSearch.upload.button')}
                        </label>
                    </p>
                    <input id="csv-upload" type="file" className="sr-only" accept=".csv" onChange={e => handleFileChange(e.target.files ? e.target.files[0] : null)} />
                    <p className="text-xs text-text-secondary/80 mt-1">{t('productSearch.upload.format')}</p>
                    {fileName && <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">{fileName}</p>}
                </div>
            </div>

            {/* 2. Results */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">{t('productSearch.results.title')}</label>
                <div className="border border-border-color rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-brand-bg/80">
                                <tr>
                                    <th className="px-4 py-2 font-semibold">{t('productSearch.table.header.product')}</th>
                                    <th className="px-4 py-2 font-semibold">{t('productSearch.table.header.store')}</th>
                                    <th className="px-4 py-2 font-semibold">{t('productSearch.table.header.status')}</th>
                                    <th className="px-4 py-2 font-semibold">{t('productSearch.table.header.images')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-text-secondary">{t('productSearch.results.placeholder')}</td>
                                    </tr>
                                ) : products.map(p => (
                                    <tr key={p.id} className="border-t border-border-color">
                                        <td className="px-4 py-2 font-medium align-top">{p.name}</td>
                                        <td className="px-4 py-2 text-text-secondary align-top">{p.store}</td>
                                        <td className="px-4 py-2 align-top">
                                            {p.status === 'idle' && <span className="text-xs font-medium text-text-secondary">{t('productSearch.status.idle')}</span>}
                                            {p.status === 'loading' && <span className="text-xs font-medium text-blue-500">{t('productSearch.status.loading')}</span>}
                                            {p.status === 'done' && <span className="text-xs font-medium text-green-500">{t('productSearch.status.done')}</span>}
                                            {p.status === 'error' && <span className="text-xs font-medium text-red-500" title={p.error}>{t('productSearch.status.error')}</span>}
                                        </td>
                                        <td className="px-4 py-2 align-top">
                                            {p.status === 'loading' && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
                                            {p.status === 'done' && (
                                                p.foundImageUrls && p.foundImageUrls.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {p.foundImageUrls.map((url, i) => (
                                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" title="Mở ảnh trong tab mới">
                                                                <img src={url} alt={`Product ${p.name} image ${i+1}`} className="w-16 h-16 object-cover rounded-md border border-border-color" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-xs text-text-secondary">{t('productSearch.images.no_images_found')}</p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-border-color">
                <button
                    onClick={handleStartSearch}
                    disabled={isSearching || products.length === 0}
                    className="w-full sm:w-auto bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-hover transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isSearching ? t('productSearch.button.searching') : t('productSearch.button.start')}
                </button>
                <button
                    onClick={handleUseProducts}
                    disabled={isSearching || products.length === 0 || products.every(p => p.status === 'idle')}
                    className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {t('productSearch.button.use')}
                </button>
                {finalMessage && <p className="text-sm font-medium text-green-600 dark:text-green-400">{finalMessage}</p>}
            </div>

             {/* Final Instructions */}
             {products.length > 0 && products.every(p => p.status !== 'idle' && p.status !== 'loading') && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-800 dark:text-blue-300 space-y-2 rounded-r-md">
                    <h4 className="font-bold text-lg">{t('productSearch.final.title')}</h4>
                    <p>1. {t('productSearch.final.instruction_1')}</p>
                    <p>2. {t('productSearch.final.instruction_2')}</p>
                    <p>3. {t('productSearch.final.instruction_3')}</p>
                </div>
            )}
        </div>
    );
};

export default ProductSearchForm;

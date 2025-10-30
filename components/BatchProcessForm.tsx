import React, { useState } from 'react';
import type { FormState } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { ChevronDownIcon } from './icons';

interface BatchProcessFormProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onBatchSubmit: () => void;
  isLoading: boolean;
}

const SheetFormatGuide: React.FC = () => {
    const { t } = useLocalization();
    const fields = [
      { key: 'Tên dự án', desc: '**(Bắt buộc)** Tên của dự án. Sẽ được dùng để tạo thư mục trên Google Drive.', example: 'Quảng cáo Sữa tắm ABC' },
      { key: 'Ý tưởng chính', desc: '**(Bắt buộc)** Mô tả ngắn gọn về ý tưởng chính của video.', example: 'Review sữa tắm mới hương hoa oải hương, mang lại cảm giác thư giãn.' },
      { key: 'Nội dung chính', desc: '**(Bắt buộc)** Các thông tin, đặc điểm chính của sản phẩm hoặc nội dung cần truyền tải.', example: 'Chiết xuất tự nhiên, dưỡng ẩm sâu, không paraben, lưu hương 8 tiếng.' },
      { key: 'Thời lượng (giây)', desc: '*(Tùy chọn)* Thời lượng video mong muốn, tính bằng giây. Nếu bỏ trống, sẽ dùng giá trị mặc định trong app (30 giây).', example: '45' },
      { key: 'Số lượng video', desc: '*(Tùy chọn)* Số lượng video cần tạo cho mỗi cảnh (tối đa 4). Nếu bỏ trống, sẽ dùng giá trị mặc định trong app (1).', example: '2' },
      { key: 'Tỷ lệ khung hình', desc: '*(Tùy chọn)* Tỷ lệ của video. Nếu bỏ trống, sẽ dùng giá trị mặc định. Các giá trị hợp lệ: `9:16`, `16:9`, `1:1`, `4:5`', example: '9:16' },
      { key: 'Phong cách Kịch bản', desc: '*(Tùy chọn)* Phong cách của kịch bản. Nếu bỏ trống, sẽ dùng giá trị mặc định. Các giá trị hợp lệ: `viral`, `koc_review`, `story`', example: 'koc_review' },
      { key: 'Phong cách Hình ảnh', desc: '*(Tùy chọn)* Phong cách hình ảnh/video. Nếu bỏ trống, sẽ dùng giá trị mặc định. Các giá trị hợp lệ: `cinematic`, `modern_trendy`, `anime`, `3d_animation`', example: 'modern_trendy' },
      { key: 'Model Tạo Ảnh', desc: t('form.batch.guide.table.imageGenModel.desc'), example: 'imagen_4' },
      { key: 'Thư mục con Thư viện Người mẫu', desc: '*(Tùy chọn)* **Tên chính xác** của thư mục con chứa ảnh người mẫu trong thư mục "Thư viện Người mẫu" GỐC trên Drive của bạn.', example: 'NguoiMau_AnNhi' },
      { key: 'Thư mục con Thư viện Sản phẩm', desc: '*(Tùy chọn)* **Tên chính xác** của thư mục con chứa ảnh sản phẩm trong thư mục "Thư viện Sản phẩm" GỐC trên Drive của bạn.', example: 'SuaTam_ABC' },
      { key: 'Mô tả bối cảnh', desc: '*(Tùy chọn)* Mô tả chi tiết về bối cảnh, môi trường quay. Nếu bỏ trống, AI sẽ tự tạo bối cảnh phù hợp.', example: 'Một phòng tắm sang trọng với bồn tắm bằng đá cẩm thạch, ánh sáng tự nhiên chan hòa.' },
      { key: 'Model Veo', desc: '*(Tùy chọn)* Model Veo để sử dụng. Nếu bỏ trống, sẽ dùng giá trị mặc định. Các giá trị hợp lệ: `veo_fast`, `veo_ultra`', example: 'veo_fast' },
      { key: 'Nền tảng Social', desc: '*(Tùy chọn)* Nền tảng sẽ đăng video, để tối ưu nội dung social. Nếu bỏ trống, sẽ dùng giá trị mặc định. Các giá trị hợp lệ: `tiktok`, `youtube`', example: 'tiktok' },
      { key: 'Mã Ngôn ngữ', desc: '*(Tùy chọn)* Mã ngôn ngữ cho kịch bản và lời thoại theo chuẩn BCP-47. Nếu bỏ trống, sẽ dùng giá trị mặc định trong app (vi-VN).', example: 'en-US' },
      { key: 'ElevenLabs Voice ID', desc: '*(Tùy chọn)* ID của giọng nói trên ElevenLabs bạn muốn sử dụng. Nếu bỏ trống, sẽ dùng ID mặc định trong Cài đặt API.', example: '3VnrjnYrskPMDsapTr8X' },
      { key: 'Người mẫu (JSON)', desc: '*(Tùy chọn)* Cung cấp thông tin chi tiết về người mẫu dưới dạng chuỗi JSON. Nếu bỏ trống, sẽ sử dụng người mẫu mặc định trong app. Xem ví dụ chi tiết bên dưới.', example: '[{"gender":"female", "age":"28", ...}]' },
    ];
    
    const jsonExample = `[
  {
    "gender": "female",
    "nationality": "vietnamese",
    "age": "28",
    "clothing": "Váy maxi màu xanh pastel",
    "hairstyle": "Tóc búi cao gọn gàng",
    "otherDetails": "Đeo một chiếc vòng cổ ngọc trai"
  },
  {
    "gender": "male",
    "nationality": "foreign",
    "age": "35",
    "clothing": "Áo sơ mi denim, quần kaki",
    "hairstyle": "Tóc ngắn vuốt ngược",
    "otherDetails": ""
  }
]`;

    return (
        <div className="mt-4 p-4 bg-brand-bg/50 dark:bg-surface/30 rounded-lg border border-border-color space-y-3 text-sm">
            <h4 className="font-bold text-text-main">{t('form.batch.guide.imageNote.title')}</h4>
            <p className="text-text-main whitespace-pre-line">{t('form.batch.guide.imageNote.body')}</p>
            
            <h4 className="font-bold text-text-main mt-4">{t('form.batch.guide.formatNote.title')}</h4>
            <p className="text-text-main">{t('form.batch.guide.formatNote.body')}</p>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-surface">
                        <tr>
                            <th className="p-2 border border-border-color font-semibold">{t('form.batch.guide.table.headerKey')}</th>
                            <th className="p-2 border border-border-color font-semibold">{t('form.batch.guide.table.headerDesc')}</th>
                            <th className="p-2 border border-border-color font-semibold">{t('form.batch.guide.table.headerExample')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map(row => (
                             <tr key={row.key} className="odd:bg-brand-bg/50 even:bg-surface/50">
                                <td className="p-2 border border-border-color font-mono text-xs align-top">{row.key}</td>
                                <td className="p-2 border border-border-color align-top" dangerouslySetInnerHTML={{ __html: row.desc.replace(/\`(.*?)\`/g, '<code class=\"text-xs bg-gray-200 dark:bg-gray-700 p-0.5 rounded\">$1</code>') }}></td>
                                <td className="p-2 border border-border-color align-top">{row.example}</td>
                             </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4">
                <h5 className="font-bold text-text-main">Ví dụ chi tiết cho cột "Người mẫu (JSON)"</h5>
                <p className="text-text-secondary text-xs mb-2">Dán toàn bộ đoạn mã dưới đây vào một ô duy nhất trong cột đó. Bạn có thể thêm hoặc bớt các khối {'{...}'} để có nhiều hoặc ít người mẫu hơn.</p>
                <pre className="p-3 bg-gray-900 text-white text-xs rounded-md whitespace-pre-wrap break-all font-mono">
                    <code>{jsonExample}</code>
                </pre>
            </div>
        </div>
    );
};


const BatchProcessForm: React.FC<BatchProcessFormProps> = ({ formState, setFormState, onBatchSubmit, isLoading }) => {
    const { t } = useLocalization();
    const [isGuideVisible, setIsGuideVisible] = useState(false);

    const handleInputChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    const isBatchFormValid = 
        formState.batchInputSheetId && 
        formState.batchModelLibraryFolderId &&
        formState.batchProductLibraryFolderId &&
        formState.batchOutputSheetId && 
        formState.batchOutputDriveFolderId && 
        formState.googleWorkspaceToken;

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-main">{t('form.section.batch')}</h3>
                <button 
                    type="button"
                    onClick={() => setIsGuideVisible(!isGuideVisible)}
                    className="flex items-center text-sm text-primary hover:underline"
                >
                    {t('form.batch.guide.title')}
                    <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform ${isGuideVisible ? 'rotate-180' : ''}`} />
                 </button>
            </div>

            {isGuideVisible && <SheetFormatGuide />}

            <p className="text-xs text-text-secondary">{t('form.batch.note')}</p>

            <div className="space-y-4 pt-2">
                <div>
                    <label htmlFor="batchInputSheetId" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.batch.inputSheetId.label')}
                    </label>
                    <input
                        id="batchInputSheetId"
                        type="text"
                        value={formState.batchInputSheetId}
                        onChange={(e) => handleInputChange('batchInputSheetId', e.target.value)}
                        placeholder={t('form.batch.inputSheetId.placeholder')}
                        className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                    />
                </div>
                 <div>
                    <label htmlFor="batchModelLibraryFolderId" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.batch.modelLibraryFolderId.label')}
                    </label>
                    <input
                        id="batchModelLibraryFolderId"
                        type="text"
                        value={formState.batchModelLibraryFolderId}
                        onChange={(e) => handleInputChange('batchModelLibraryFolderId', e.target.value)}
                        placeholder={t('form.batch.modelLibraryFolderId.placeholder')}
                        className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                    />
                </div>
                 <div>
                    <label htmlFor="batchProductLibraryFolderId" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.batch.productLibraryFolderId.label')}
                    </label>
                    <input
                        id="batchProductLibraryFolderId"
                        type="text"
                        value={formState.batchProductLibraryFolderId}
                        onChange={(e) => handleInputChange('batchProductLibraryFolderId', e.target.value)}
                        placeholder={t('form.batch.productLibraryFolderId.placeholder')}
                        className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                    />
                </div>
                <div>
                    <label htmlFor="batchOutputSheetId" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.batch.outputSheetId.label')}
                    </label>
                    <input
                        id="batchOutputSheetId"
                        type="text"
                        value={formState.batchOutputSheetId}
                        onChange={(e) => handleInputChange('batchOutputSheetId', e.target.value)}
                        placeholder={t('form.batch.outputSheetId.placeholder')}
                        className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                    />
                </div>
                 <div>
                    <label htmlFor="batchOutputDriveFolderId" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.batch.outputDriveFolderId.label')}
                    </label>
                    <input
                        id="batchOutputDriveFolderId"
                        type="text"
                        value={formState.batchOutputDriveFolderId}
                        onChange={(e) => handleInputChange('batchOutputDriveFolderId', e.target.value)}
                        placeholder={t('form.batch.outputDriveFolderId.placeholder')}
                        className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                    />
                </div>
            </div>

            <div className="pt-4">
                 <button
                    onClick={onBatchSubmit}
                    disabled={isLoading || !isBatchFormValid}
                    className="w-full bg-success text-white font-bold py-3 px-4 rounded-md hover:bg-success-hover transition-colors disabled:bg-text-secondary/50 disabled:cursor-not-allowed"
                >
                    {isLoading ? t('form.button.generating') : t('form.button.batchGenerate')}
                </button>
            </div>
        </div>
    );
};

export default BatchProcessForm;
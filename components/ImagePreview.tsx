import React, { useState, useEffect } from 'react';

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <div className="relative inline-block w-full">
      {previewUrl && (
        <img
          src={previewUrl}
          alt={file.name}
          className="h-24 w-full rounded-md object-cover"
        />
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 focus:outline-none"
        aria-label="Remove image"
      >
        &times;
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">{file.name}</p>
    </div>
  );
};

export default ImagePreview;
// legal_app_frontend/src/pages/DocumentUpload/DocumentUpload.tsx
import React, { useState } from 'react';
import styles from './DocumentUpload.module.css';
import Button from '../../components/common/Button/Button';

const DocumentUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // The issue is on this line - we need to check files[0] is defined before using it
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]; // Get the file first
      if (selectedFile) { // Explicitly check it's not undefined
        setFile(selectedFile); // Now TypeScript knows it's definitely a File
        setUploadComplete(false);
        setUploadError('');
      }
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }
    
    setUploading(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setUploadComplete(true);
      setUploadError('');
    } catch (error) {
      setUploadError('An error occurred during upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className={styles['documentUpload']}>
      <div className={styles['container']}>
        <h1 className={styles['title']}>Document Upload</h1>
        <p className={styles['subtitle']}>Upload legal documents for analysis</p>
        
        <div className={styles['uploadArea']}>
          <div className={styles['fileUploadContainer']}>
            <div 
              className={`${styles['dropzone']} ${file ? styles['hasFile'] : ''}`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              {file ? (
                <div className={styles['fileInfo']}>
                  <div className={styles['fileName']}>{file.name}</div>
                  <div className={styles['fileSize']}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ) : (
                <>
                  <div className={styles['uploadIcon']}>📄</div>
                  <p>Drag and drop your file here or click to browse</p>
                  <span className={styles['fileTypes']}>Supported formats: PDF, DOCX, TXT</span>
                </>
              )}
            </div>
            <input
              type="file"
              id="fileInput"
              className={styles['fileInput']}
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt"
            />
          </div>
          
          <div className={styles['uploadActions']}>
            <Button 
              variant="primary" 
              onClick={handleUpload}
              disabled={!file || uploading}
              fullWidth
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
            
            {uploadError && (
              <div className={styles['errorMessage']}>{uploadError}</div>
            )}
            
            {uploadComplete && (
              <div className={styles['successMessage']}>
                Upload complete! Your document is being processed.
              </div>
            )}
          </div>
        </div>
        
        <div className={styles['uploadTips']}>
          <h3>Upload Tips</h3>
          <ul>
            <li>For best results, upload clean, searchable PDF documents</li>
            <li>Maximum file size: 20MB</li>
            <li>Text within images will not be processed unless OCR is enabled</li>
            <li>Encrypted or password-protected documents cannot be processed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
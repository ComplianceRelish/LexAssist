import React from 'react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  logo?: boolean;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  logo = true, 
  children,
  maxWidth = '500px'
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-content" style={{ maxWidth }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-header">
          {logo && <img src="/images/logo.png" alt="Lex Assist Logo" className="modal-logo" />}
          <h2>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;

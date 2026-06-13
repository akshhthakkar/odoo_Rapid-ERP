import React, { forwardRef } from 'react';

/**
 * Reusable Input component.
 */
const Input = forwardRef(({
  label,
  error,
  type = 'text',
  placeholder,
  className = '',
  id,
  ...props
}, ref) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        placeholder={placeholder}
        className={`erp-input ${error ? 'border-red-500' : ''} ${className}`}
        style={error ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' } : {}}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

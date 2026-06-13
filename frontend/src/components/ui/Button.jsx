import React from 'react';

/**
 * Reusable Button component.
 * Variants: 'primary' | 'secondary' | 'danger' | 'success'
 * Sizes: 'sm' | 'md' | 'lg'
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
  }[variant] || 'btn-primary';

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  }[size] || '';

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${fullWidth ? 'btn-full' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            style={{ minWidth: 16 }}
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60" />
          </svg>
          <span>Loading...</span>
        </>
      ) : children}
    </button>
  );
};

export default Button;

'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const togglePasswordVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="relative w-full">
        <input
          type={showPassword ? 'text' : 'password'}
          className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 focus:outline-none"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

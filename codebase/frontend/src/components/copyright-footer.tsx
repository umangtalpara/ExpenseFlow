'use client';

import React, { useState, useEffect } from 'react';

interface CopyrightFooterProps {
  defaultText?: string;
  className?: string;
}

export function CopyrightFooter({
  defaultText,
  className = 'mt-8 text-center text-xs text-slate-500/50 w-full',
}: CopyrightFooterProps) {
  const [isProvenPeak, setIsProvenPeak] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      setIsProvenPeak(hostname === 'provenpeak.com' || hostname.endsWith('.provenpeak.com'));
    }
  }, []);

  if (isProvenPeak) {
    return (
      <div className={className}>
        <p>© 2026 ProvenPeak Solutions. All rights reserved.</p>
      </div>
    );
  }

  return defaultText ? (
    <div className={className}>
      <p>{defaultText}</p>
    </div>
  ) : null;
}

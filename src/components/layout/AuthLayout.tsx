import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-mesh-gradient flex items-center justify-center p-4">
      {children}
    </div>
  );
}

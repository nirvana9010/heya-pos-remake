'use client';

import { useEffect } from 'react';

export default function TestJSPage() {
  useEffect(() => {
    console.log('TestJSPage mounted - JavaScript is running!');
    
    // Add a global click listener to see if clicks are registering at all
    const handleClick = (e: MouseEvent) => {
      console.log('Global click detected on:', e.target);
    };
    
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">JavaScript Test Page</h1>
      <p>Open the console and check if you see the "JavaScript is running!" message.</p>
      <p>Click anywhere on the page and check if global clicks are detected.</p>
      
      <div className="mt-4 p-4 bg-blue-500 text-white">
        Click this blue box - check console for global click event
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          console.log('Inline script executed!');
          document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded!');
          });
        `
      }} />
    </div>
  );
}
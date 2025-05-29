'use client';

import { useState } from 'react';

export default function TestBasicPage() {
  const [count, setCount] = useState(0);
  const [showDiv, setShowDiv] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Basic Test Page</h1>
      
      {/* Test 1: Native HTML button */}
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Test 1: Native HTML Button</h2>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => {
            console.log('Native button clicked');
            setCount(count + 1);
          }}
        >
          Click me (Count: {count})
        </button>
      </div>

      {/* Test 2: Native div with onClick */}
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Test 2: Div with onClick</h2>
        <div 
          className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer inline-block"
          onClick={() => {
            console.log('Div clicked');
            setShowDiv(!showDiv);
          }}
        >
          Toggle Div (Click me)
        </div>
        {showDiv && <div className="mt-2 p-2 bg-gray-200">Toggled content!</div>}
      </div>

      {/* Test 3: Input onChange */}
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Test 3: Input onChange</h2>
        <input 
          type="text"
          className="border p-2"
          onChange={(e) => console.log('Input changed:', e.target.value)}
          placeholder="Type something..."
        />
      </div>
    </div>
  );
}
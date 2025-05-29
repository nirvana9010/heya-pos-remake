export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Test Page</h1>
        <p className="text-lg text-gray-700 mb-8">
          This is a test page to verify Tailwind CSS is working.
        </p>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">UI Components Test</h2>
          <div className="space-y-4">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Test Button
            </button>
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              Success Message
            </div>
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              Error Message
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3 text-gray-600 py-4">
      <div className="flex gap-1">
        <div 
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
          style={{ animationDelay: '0ms', animationDuration: '1s' }} 
        />
        <div 
          className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" 
          style={{ animationDelay: '150ms', animationDuration: '1s' }} 
        />
        <div 
          className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" 
          style={{ animationDelay: '300ms', animationDuration: '1s' }} 
        />
      </div>
      <span className="text-sm font-medium">AI is thinking...</span>
    </div>
  );
}

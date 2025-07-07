export const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  ...props
}) => {
  const variants = {
    primary:
      "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-sm disabled:bg-blue-400",
    secondary:
      "bg-gray-100 hover:bg-gray-200 focus:ring-gray-500 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:focus:ring-gray-400",
    outline:
      "border-2 border-gray-300 hover:border-gray-400 focus:ring-gray-500 text-gray-700 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-300 dark:focus:ring-gray-400 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800",
    ghost:
      "hover:bg-gray-100 focus:ring-gray-500 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-400",
    danger:
      "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-sm disabled:bg-red-400",
    success:
      "bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white shadow-sm disabled:bg-green-400",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    xl: "px-8 py-4 text-lg",
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
        disabled:cursor-not-allowed disabled:opacity-50 theme-transition
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

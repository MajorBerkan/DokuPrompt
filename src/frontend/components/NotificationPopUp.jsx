import { useEffect } from "react";

/**
 * NotificationPopUp Component
 * Displays a temporary notification message with auto-dismiss functionality
 * Supports different types (success, error, warning, info) with corresponding styling
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Notification title
 * @param {string} props.message - Notification message content
 * @param {Function} props.onClose - Callback function when notification closes
 * @param {string} props.type - Notification type (success, error, warning, info)
 * @param {number} props.duration - Duration in milliseconds before auto-dismiss (default: 6000)
 * @returns {React.ReactElement} The notification popup component
 */
export default function NotificationPopUp({
  title,
  message,
  onClose,
  type,
  duration = 6000,
}) {
  const colorClasses = {
    success: "border-green-500 bg-green-50 dark:bg-green-900/40",
    error: "border-red-500 bg-red-50 dark:bg-red-900/40",
    warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/40",
    info: "border-blue-500 bg-blue-50 dark:bg-blue-900/40",
  };

  const icons = {
    success: (
      <img src={"../img/success.png"} alt="Success" className="w-5 h-5" />
    ),
    error: (
      <img src={"../img/error.png"} alt="Error" className="w-5 h-5" />
    ),
    warning: (
      <img src={"../img/warning.png"} alt="Warning" className="w-5 h-5" />
    ),
    info: <img src={"../img/info.png"} alt="Info" className="w-5 h-5" />,
  };

  /**
   * Auto-dismiss notification after specified duration
   */
  useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  /**
   * Log notification details for debugging purposes
   */
  useEffect(() => {
    console.log(`[Notification] Displaying notification - Type: ${type}, Title: ${title}`);
    if (type === "error") {
      console.error(`[Notification Error] ${title}: ${message}`);
    }
  }, [type, title, message]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`px-4 py-3 rounded-lg shadow-lg min-w-[250px] max-w-[400px] border ${colorClasses[type]}`}
      >
        <div className={"flex items-start gap-2"}>
          <div className="flex-shrink-0">{icons[type]}</div>
          <div className={"flex flex-col flex-1"}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 break-words max-h-[120px] overflow-y-auto">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

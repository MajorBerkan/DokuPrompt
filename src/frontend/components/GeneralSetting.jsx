import { useEffect, useState } from "react";
import { saveGeneralSettings, getGeneralSettings } from "../lib/api.js";

/**
 * GeneralSetting Component
 * Provides interface for managing general repository settings
 * Allows configuration of general prompt, auto-check interval, and enable/disable auto-checking
 *
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback to close the settings panel
 * @returns {React.ReactElement} The general settings component
 */
export default function GeneralSetting({ onClose }) {
  const [generalPrompt, setGeneralPrompt] = useState("");
  const [checkInterval, setCheckInterval] = useState("60");
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState("");
  const isSaveDisabled =
    !disabled &&
    (checkInterval === "" ||
      parseInt(checkInterval) < 1 ||
      parseInt(checkInterval) > 10080);

  /**
   * Saves general settings to the backend
   * Validates check interval before saving
   */
  const handleSave = async () => {
    try {
      // Validate check interval
      if (!disabled) {
        const intervalValue = parseInt(checkInterval);
        if (
          isNaN(intervalValue) ||
          intervalValue < 1 ||
          intervalValue > 10080
        ) {
          setError("Enter number between 1 and 10080.");
          return;
        }
      }

      await saveGeneralSettings({
        prompt: generalPrompt,
        checkInterval: disabled ? null : parseInt(checkInterval),
        disabled,
      });
      setError("");
      console.log("General settings saved successfully.");
      onClose();
    } catch (err) {
      setError("Failed to save general settings. Please try again.");
      console.error("Failed to save general settings:", err);
    }
  };

  /**
   * Load current general settings from the database on component mount
   */
  useEffect(() => {
    (async () => {
      try {
        const { prompt, checkInterval, disabled } = await getGeneralSettings();
        setGeneralPrompt(prompt);
        setCheckInterval(String(checkInterval || 60));
        setDisabled(disabled || false);
        setError("");
      } catch (err) {
        setError("Failed to load general settings. Please try again.");
        console.error("Failed to load general settings:", err);
      }
    })();
  }, []);

  return (
    <section className="mb-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-[#3200C8] dark:bg-dark-bg dark:text-[#8080ff] hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded "
            aria-label="Back"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            General Repository Settings
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            General Prompt
          </h4>
          <textarea
            value={generalPrompt}
            onChange={(e) => setGeneralPrompt(e.target.value)}
            placeholder="No general prompt"
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 hover:border-[#3200c8] dark:hover:border-[#8080ff] focus:outline-none resize-y w-full min-h-[23rem] max-h-[35rem] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div className="flex flex-col gap-4">
          {!disabled && (
            <div className="flex gap-4 items-center">
              <label className="text-gray-900 dark:text-gray-100">
                Automatic Update Interval:
              </label>
              <input
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string or any number (including 0) for better UX
                  // Validation happens on save
                  if (value === "") {
                    setCheckInterval("");
                  } else {
                    const numValue = parseInt(value);
                    if (
                      !isNaN(numValue) &&
                      numValue >= 0 &&
                      numValue <= 10080
                    ) {
                      setCheckInterval(String(numValue));
                    }
                  }
                }}
                type="number"
                min="0"
                max="10080"
                value={checkInterval}
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 w-24"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                (1-10080 Minutes, i.e., 1 min - 7 days)
              </span>
              <button
                onClick={() => setDisabled(true)}
                className="text-[#3200C8] dark:text-[#8080ff]  dark:bg-dark-bg"
              >
                Deactivate
              </button>
            </div>
          )}

          {disabled && (
            <div className="flex gap-4 items-center">
              <span className="text-gray-500 dark:text-gray-400">
                Automatic updates are deactivated.
              </span>
              <button
                onClick={() => setDisabled(false)}
                className="text-[#3200C8] dark:text-[#8080ff] dark:bg-dark-bg"
              >
                Activate
              </button>
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Updates are based on commits to the repository. If there are no new
            commits the documentation will not be updated.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaveDisabled}
          className={
            isSaveDisabled
              ? "opacity-50 cursor-not-allowed bg-[#3200c8] dark:bg-[#8080ff] self-start text-white px-4 py-2 rounded inline-flex items-center gap-4 hover:bg-[#220094] dark:hover:bg-[#6060dd] "
              : "bg-[#3200c8] dark:bg-[#8080ff] self-start text-white px-4 py-2 rounded inline-flex items-center gap-4 hover:bg-[#220094] dark:hover:bg-[#6060dd] "
          }
        >
          <img src="../img/save.png" alt={"Save"} />
          <span>Save Changes</span>
        </button>
        {error && <div className={"text-red-500"}>{error}</div>}
      </div>
    </section>
  );
}

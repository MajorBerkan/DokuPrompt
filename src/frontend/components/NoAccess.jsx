/**
 * NoAccess Component
 * Displays an access denied message when user lacks required permissions
 * 
 * @returns {React.ReactElement} The no access component
 */
export default function NoAccess() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold">Access denied</h1>
      <p className="text-gray-600 mt-2">
        You do not have permission to view this page.
      </p>
    </div>
  );
}

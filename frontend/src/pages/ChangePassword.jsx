import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const hasUpper = (v) => /[A-Z]/.test(v);
const hasLower = (v) => /[a-z]/.test(v);
const hasDigit = (v) => /\d/.test(v);
const hasSpecial = (v) => /[#$@!%*?&]/.test(v);

const ChangePassword = () => {
  const navigate = useNavigate();
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const checks = {
    length: newPassword.length >= 8,
    upper: hasUpper(newPassword),
    lower: hasLower(newPassword),
    digit: hasDigit(newPassword),
    special: hasSpecial(newPassword)
  };

  const allChecksPassed = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (!allChecksPassed) {
      setError('New password does not meet the required policy.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(currentPassword, newPassword, confirmPassword);
    if (result.success) {
      navigate(result.redirectPath || '/dashboard', { replace: true });
      return;
    }

    setError(result.error || 'Failed to change password.');
    setIsSubmitting(false);
  };

  const ruleClass = (ok) =>
    `text-sm flex items-center gap-2 ${ok ? 'text-green-600' : 'text-gray-500'}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
          <p className="text-gray-500 mt-2 text-sm">
            You must update your temporary password before continuing.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
            <p className={ruleClass(checks.length)}>
              <CheckCircle2 className="w-4 h-4" />
              At least 8 characters
            </p>
            <p className={ruleClass(checks.upper)}>
              <CheckCircle2 className="w-4 h-4" />
              At least one uppercase letter
            </p>
            <p className={ruleClass(checks.lower)}>
              <CheckCircle2 className="w-4 h-4" />
              At least one lowercase letter
            </p>
            <p className={ruleClass(checks.digit)}>
              <CheckCircle2 className="w-4 h-4" />
              At least one number
            </p>
            <p className={ruleClass(checks.special)}>
              <CheckCircle2 className="w-4 h-4" />
              At least one special character (`#$@!%*?&`)
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Change Password</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;

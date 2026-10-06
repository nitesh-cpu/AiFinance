import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

export const ForgotPassword = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      if (res.success) {
        setSubmitted(true);
        addToast(`Password reset link sent to ${email}`, 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to send reset link.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 md:p-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-4">
          <Sparkles className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Forgot your password?</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Enter your registered email address and we'll send you a password reset link.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nitesh@example.com"
                required
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full py-3" isLoading={isLoading}>
              Send Reset Link
            </Button>
          </form>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center mb-6 animate-fadeIn">
            <MailCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-emerald-900">Check your inbox!</p>
            <p className="text-xs text-emerald-700 mt-1">
              We've emailed instructions to <strong>{email}</strong>.
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

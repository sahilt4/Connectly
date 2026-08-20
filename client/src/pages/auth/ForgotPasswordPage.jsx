import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetToken, setDevResetToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setSubmitted(true);
        if (res.data.resetToken) {
          setDevResetToken(res.data.resetToken);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
          Forgot Password?
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Enter your account email and we'll send you a password reset link.
        </p>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              If an account exists with <strong>{email}</strong>, a password reset link has been dispatched.
            </p>

            {devResetToken && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-left space-y-1">
                <span className="font-semibold text-emerald-600">Dev Reset Link:</span>
                <Link
                  to={`/reset-password?token=${devResetToken}&email=${encodeURIComponent(email)}`}
                  className="block text-emerald-600 underline break-all font-mono"
                >
                  /reset-password?token={devResetToken}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Account Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
            >
              Send Reset Link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mail, Lock, LogIn, Eye, EyeOff, CheckCircle } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const registeredMessage = location.state?.registeredMessage;
  const verifiedMessage = location.state?.verifiedMessage;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Brand logo & title */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mx-auto mb-3">
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2 22l5.15-1.33A9.955 9.955 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.61 0-3.1-.47-4.36-1.28l-.31-.2-3.23.84.86-3.15-.2-.33A7.95 7.95 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Welcome to <span className="gradient-text-primary">Connectly</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Sign in to your private communication space
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800/80">
        {registeredMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{registeredMessage}</span>
          </div>
        )}

        {verifiedMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{verifiedMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email, Username, or Public ID"
            icon={Mail}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. alex@example.com or alex_smith"
            required
          />

          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              rightIcon={showPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowPassword((p) => !p)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <div className="flex justify-end mt-1.5">
              <Link
                to="/forgot-password"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900/60">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            icon={LogIn}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-5 text-center border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

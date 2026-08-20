import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { User, AtSign, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const res = await register(name, username, email, password);
      // Navigate to chat or verification screen
      navigate('/', {
        state: {
          registeredMessage:
            res.verificationToken
              ? `Account created! (Dev Verification Token: ${res.verificationToken})`
              : 'Account created! Please check your email to verify.',
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || 'Registration failed. Please check your details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mx-auto mb-3">
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2 22l5.15-1.33A9.955 9.955 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.61 0-3.1-.47-4.36-1.28l-.31-.2-3.23.84.86-3.15-.2-.33A7.95 7.95 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Join <span className="gradient-text-primary">Connectly</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Start messaging with pure privacy & speed
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800/80">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            icon={User}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Smith"
            required
          />

          <Input
            label="Username"
            icon={AtSign}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="e.g. alex_smith"
            helperText="Only letters, numbers, and underscores."
            required
          />

          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. alex@example.com"
            required
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            rightIcon={showPassword ? EyeOff : Eye}
            onRightIconClick={() => setShowPassword((p) => !p)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
          />

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
            icon={UserPlus}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 pt-5 text-center border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

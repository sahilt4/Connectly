import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Verification token is missing.');
        setLoading(false);
        return;
      }

      try {
        const res = await api.post('/auth/verify-email', { token, email });
        if (res.data.success) {
          setSuccess(true);
          await refreshUser();
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Verification link is invalid or expired.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, email]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
        {loading ? (
          <div className="py-8 space-y-3">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Verifying your email...
            </h2>
          </div>
        ) : success ? (
          <div className="py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Email Verified!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your email address has been successfully verified. You now have full access to Nova.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-4"
              onClick={() => navigate('/')}
            >
              Continue to Messages
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Verification Failed
            </h2>
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="secondary" size="md" className="w-full">
                  Return to Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

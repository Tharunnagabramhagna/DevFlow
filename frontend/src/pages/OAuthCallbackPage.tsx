import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DevFlowLogo } from '@/components/common';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleOAuthExchange } = useAuth();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function processOAuthCallback() {
      // Parse query params from hash location (e.g. #/oauth/callback?code=...)
      const search = location.search || (location.pathname.includes('?') ? location.pathname.substring(location.pathname.indexOf('?')) : '');
      const params = new URLSearchParams(search || window.location.search || window.location.hash.split('?')[1]);

      const code = params.get('code');
      const error = params.get('error') || params.get('error_description');

      if (error) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(decodeURIComponent(error));
        }
        return;
      }

      if (!code) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('No authorization code was found in the provider callback URL.');
        }
        return;
      }

      try {
        await handleOAuthExchange(code);
        if (isMounted) {
          setStatus('success');
          // Smooth redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 800);
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'OAuth authorization exchange failed. Please try logging in again.');
        }
      }
    }

    processOAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [location, handleOAuthExchange, navigate]);

  return (
    <div className="min-h-screen bg-[#080D18] text-[#F8FAFC] flex flex-col justify-between items-center selection:bg-[#0070BA] selection:text-white relative overflow-hidden py-12 px-4">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-purple-600/10 blur-3xl pointer-events-none rounded-full" />

      {/* Top Header */}
      <header className="relative z-10">
        <Link to="/" className="inline-block">
          <DevFlowLogo variant="horizontal" theme="auto" size="md" />
        </Link>
      </header>

      {/* Main Card */}
      <main className="max-w-md w-full relative z-10 my-auto">
        <div className="bg-[#111C30] border border-[#26344B] rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center space-y-5">
          {status === 'processing' && (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Authorizing with Provider
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Verifying your provider credentials and securely establishing your DevFlow workspace session...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Authentication Successful
              </h2>
              <p className="text-xs text-slate-400">
                Redirecting to your DevFlow dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Authentication Failed
                </h2>
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left leading-relaxed">
                  {errorMessage}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="py-2.5 px-4 rounded-lg border border-[#26344B] text-slate-300 hover:text-white hover:bg-[#1B2A47] text-xs font-semibold transition-colors"
                >
                  Go to Sign Up
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 relative z-10">
        <span>DevFlow Secure OAuth 2.0 Engine &bull; PayPal Hackathon</span>
      </footer>
    </div>
  );
};

export default OAuthCallbackPage;


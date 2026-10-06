import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: 'Weak', color: 'bg-slate-200' };
    if (password.length < 6) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
    }
    return { score: 2, label: 'Medium', color: 'bg-amber-500' };
  };

  const strength = getPasswordStrength();

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!email) errs.email = 'Email address is required';
    if (!password) errs.password = 'Password is required';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!agreeTerms) errs.agreeTerms = 'You must agree to the Terms and Privacy Policy';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await register(fullName.trim(), email.trim(), password);
      if (res.success) {
        addToast('Account created successfully!', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Registration failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 md:p-10">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create your SpendSense account</h2>
          <p className="text-xs text-slate-500 mt-1">Start understanding your money better</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nitesh Kumar Mehta"
              className={`w-full px-4 py-2.5 text-xs bg-slate-50 border ${
                errors.fullName ? 'border-rose-500' : 'border-slate-200'
              } rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition`}
            />
            {errors.fullName && <p className="text-[11px] text-rose-500 mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nitesh@example.com"
              className={`w-full px-4 py-2.5 text-xs bg-slate-50 border ${
                errors.email ? 'border-rose-500' : 'border-slate-200'
              } rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition`}
            />
            {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full pl-4 pr-10 py-2.5 text-xs bg-slate-50 border ${
                  errors.password ? 'border-rose-500' : 'border-slate-200'
                } rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                  <span>Password Strength</span>
                  <span className="font-bold">{strength.label}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {errors.password && <p className="text-[11px] text-rose-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className={`w-full px-4 py-2.5 text-xs bg-slate-50 border ${
                errors.confirmPassword ? 'border-rose-500' : 'border-slate-200'
              } rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition`}
            />
            {errors.confirmPassword && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>I agree to the Terms and Privacy Policy</span>
            </label>
            {errors.agreeTerms && <p className="text-[11px] text-rose-500 mt-1">{errors.agreeTerms}</p>}
          </div>

          <Button type="submit" variant="primary" className="w-full py-3 mt-2" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, Eye, EyeOff, X, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: code, 3: new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  
  const { login, isAuthenticated, logout, sendResetCode, verifyResetCode, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Auto-logout when landing on login page
  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  // Forgot password handlers
  const handleSendCode = async () => {
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address');
      setForgotLoading(false);
      return;
    }

    const result = await sendResetCode(forgotEmail);
    
    if (result.success) {
      setForgotSuccess(result.message);
      setForgotStep(2);
    } else {
      setForgotError(result.error);
    }
    
    setForgotLoading(false);
  };

  const handleVerifyCode = async () => {
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    const result = await verifyResetCode(forgotEmail, resetCode);
    
    if (result.success) {
      setResetToken(result.resetToken);
      setForgotStep(3);
    } else {
      setForgotError(result.error);
    }
    
    setForgotLoading(false);
  };

  const handleResetPassword = async () => {
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match');
      setForgotLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters');
      setForgotLoading(false);
      return;
    }

    const result = await resetPassword(resetToken, newPassword);
    
    if (result.success) {
      setForgotSuccess(result.message);
      // Close modal after 2 seconds and let user login
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep(1);
        setForgotEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setForgotSuccess('');
      }, 2000);
    } else {
      setForgotError(result.error);
    }
    
    setForgotLoading(false);
  };

  const resetForgotModal = () => {
    setForgotStep(1);
    setForgotEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setForgotError('');
    setForgotSuccess('');
  };

  // Reset modal state when opening
  useEffect(() => {
    if (showForgotModal) {
      resetForgotModal();
    }
  }, [showForgotModal]);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <Lock size={32} />
          </div>
          <h1>PMO Dashboard</h1>
          <p>Sign in to your account</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">
              <User size={16} />
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={16} />
              Password
            </label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="login-help">
            <p>Having Trouble SignIng In Please Contact Daksh Hooda (daksh.hooda@zapcg.com)</p>
          </div>

          <div className="forgot-password-link">
            <button 
              type="button" 
              className="link-button"
              onClick={() => setShowForgotModal(true)}
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => !forgotLoading && setShowForgotModal(false)}>
          <div className="forgot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="forgot-modal-header">
              <h2>
                {forgotStep === 1 && <><Mail size={20} /> Reset Password</>}
                {forgotStep === 2 && <><KeyRound size={20} /> Enter Code</>}
                {forgotStep === 3 && <><Lock size={20} /> New Password</>}
              </h2>
              <button 
                className="close-button" 
                onClick={() => setShowForgotModal(false)}
                disabled={forgotLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="forgot-modal-body">
              {forgotError && <div className="forgot-error">{forgotError}</div>}
              {forgotSuccess && <div className="forgot-success">{forgotSuccess}</div>}

              {/* Step 1: Enter Email */}
              {forgotStep === 1 && (
                <>
                  <p className="forgot-instructions">
                    Enter your email address and we'll send you a reset code.
                  </p>
                  <div className="form-group">
                    <label htmlFor="forgot-email">
                      <Mail size={16} />
                      Email
                    </label>
                    <input
                      type="email"
                      id="forgot-email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      disabled={forgotLoading}
                    />
                  </div>
                  <button
                    className="forgot-button"
                    onClick={handleSendCode}
                    disabled={forgotLoading || !forgotEmail}
                  >
                    {forgotLoading ? 'Sending...' : 'Send Code'}
                  </button>
                </>
              )}

              {/* Step 2: Enter Code */}
              {forgotStep === 2 && (
                <>
                  <p className="forgot-instructions">
                    Enter the 8-character code sent to <strong>{forgotEmail}</strong>
                  </p>
                  <div className="form-group">
                    <label htmlFor="reset-code">
                      <KeyRound size={16} />
                      Reset Code
                    </label>
                    <input
                      type="text"
                      id="reset-code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g., A7B9C2D8)"
                      maxLength={8}
                      disabled={forgotLoading}
                      style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
                    />
                  </div>
                  <div className="forgot-actions">
                    <button
                      type="button"
                      className="back-button"
                      onClick={() => setForgotStep(1)}
                      disabled={forgotLoading}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      className="forgot-button"
                      onClick={handleVerifyCode}
                      disabled={forgotLoading || resetCode.length !== 8}
                    >
                      {forgotLoading ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                  <p className="resend-code">
                    Didn't receive it?{' '}
                    <button 
                      type="button" 
                      className="link-button"
                      onClick={handleSendCode}
                      disabled={forgotLoading}
                    >
                      Resend Code
                    </button>
                  </p>
                </>
              )}

              {/* Step 3: New Password */}
              {forgotStep === 3 && (
                <>
                  <p className="forgot-instructions">
                    Enter your new password.
                  </p>
                  <div className="form-group">
                    <label htmlFor="new-password">
                      <Lock size={16} />
                      New Password
                    </label>
                    <div className="password-input">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 chars)"
                        disabled={forgotLoading}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirm-password">
                      <Lock size={16} />
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      disabled={forgotLoading}
                    />
                  </div>
                  <div className="forgot-actions">
                    <button
                      type="button"
                      className="back-button"
                      onClick={() => setForgotStep(2)}
                      disabled={forgotLoading}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      className="forgot-button"
                      onClick={handleResetPassword}
                      disabled={forgotLoading || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                    >
                      {forgotLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

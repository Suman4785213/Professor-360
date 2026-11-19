import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../api/client';
import { Professor360Logo } from '../../components/common/Professor360Logo';
import { readResetToken, validateReset, resetError } from './resetPassword';

export function ResetPasswordView() {
  const [token] = useState(() => readResetToken(window.location));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const error = validateReset(password, confirmation, token);
    if (error) { setMessage(error); return; }
    setBusy(true); setMessage('');
    try {
      await axios.post(`${API_BASE}/auth/reset-password/`, { token, new_password: password, confirm_password: confirmation });
      setDone(true); setPassword(''); setConfirmation('');
      window.history.replaceState(null, '', '/reset-password');
    } catch (error) { setMessage(resetError(error)); }
    finally { setBusy(false); }
  }
  async function requestLink(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try { const res = await axios.post(`${API_BASE}/auth/forgot-password/`, { email }); setMessage(res.data.message); }
    catch { setMessage('Unable to request a link. Please try again later or contact support.'); }
    finally { setBusy(false); }
  }
  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:ring-2 focus:ring-indigo-500';
  return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl space-y-5">
      <Professor360Logo showText size="lg" />
      <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
      {done ? <p role="status">Your password has been reset. You can now sign in.</p> : <>
        {token ? <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">New password<input className={inputClass} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label className="block text-sm font-semibold">Confirm password<input className={inputClass} type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
          <button disabled={busy} className="w-full rounded-lg bg-indigo-600 p-3 font-bold text-white disabled:opacity-50">{busy ? 'Please wait...' : 'Reset password'}</button>
        </form> : <p className="text-sm text-slate-600">Enter your institutional email to request a secure reset link.</p>}
        <form onSubmit={requestLink} className="space-y-3 border-t pt-4">
          <label className="block text-sm font-semibold">Email address<input className={inputClass} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <button disabled={busy} className="font-semibold text-indigo-600">Send a new reset link</button>
        </form>
      </>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
      <Link to="/login" className="block text-sm font-semibold text-indigo-600">Back to sign in</Link>
    </section>
  </main>;
}

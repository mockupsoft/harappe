/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, LogIn, UserPlus, Settings, Eye, EyeOff, AlertCircle } from 'lucide-react';
import LoadingView from '../components/LoadingView';
import { motion, AnimatePresence } from 'framer-motion';
import { localDb } from '../lib/localDb';
import { emailGrantsAdmin, profileIndicatesAdmin } from '../lib/adminPolicy';
import type { UserProfile } from '../types';

type LoginMode = 'customer' | 'staff';

type LocalSession = { uid: string; email: string; displayName: string };

function getLocalAuthMessage(code: string, serverDetail?: string): string {
  if (code === 'server_error' && import.meta.env.DEV && serverDetail?.trim()) {
    return `Sunucu: ${serverDetail.trim()}`;
  }
  const messages: Record<string, string> = {
    email_in_use: 'Bu e-posta adresi zaten kullanımda.',
    weak_password: 'Şifre en az 6 karakter olmalı.',
    invalid_email: 'Geçersiz e-posta adresi.',
    invalid_credentials: 'E-posta veya şifre hatalı.',
    server_error:
      'Sunucu veya veritabanı hatası. API adresini (.env), MySQL’i ve Laragon’u kontrol edin; sorun sürerse geliştirici konsolunda ayrıntı görünür.',
    invalid_body: 'Geçersiz istek.',
    empty_response: 'Sunucudan yanıt alınamadı.',
    unknown_action: 'Geçersiz işlem.',
  };
  return messages[code] ?? 'İşlem başarısız oldu. Bilgilerinizi kontrol edin.';
}

function applyLocalSession(session: LocalSession) {
  localStorage.setItem(
    'harappe_session',
    JSON.stringify({
      uid: session.uid,
      email: session.email,
      displayName: session.displayName,
    })
  );
  window.dispatchEvent(new Event('profile_updated'));
}

/** Profili API ile senkronlar (oturum nesnesi Firebase değil). */
async function syncProfileForSession(session: LocalSession): Promise<UserProfile | null> {
  const email = session.email || '';
  const owner = emailGrantsAdmin(email);
  let p = await localDb.getProfile(session.uid);
  if (!p) {
    p = {
      uid: session.uid,
      name: session.displayName || (owner ? 'Admin' : 'Misafir'),
      email,
      rewardPoints: 0,
      isAdmin: owner,
      createdAt: new Date(),
    };
    await localDb.saveProfile(p);
  } else if (owner && !p.isAdmin) {
    p = { ...p, isAdmin: true };
    await localDb.saveProfile(p);
  }
  return p;
}

/** Personel: yalnızca yönetici e-postası veya profil isAdmin. */
async function ensureStaffAccessLocal(session: LocalSession): Promise<boolean> {
  const p = await syncProfileForSession(session);
  return profileIndicatesAdmin(p, session.email);
}

function LoginShell({ mode }: { mode: LoginMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isStaff = mode === 'staff';
  const staffDeniedMsg =
    'Bu alan yalnızca yetkili personel içindir. Hesabınızda yönetici yetkisi bulunmuyor.';

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setErrorMsg(null);
    const trimmedEmail = email.trim().toLowerCase();

    try {
      if (isStaff && isRegistering) {
        setErrorMsg('Personel paneli için buradan kayıt açılmaz.');
        setIsLoggingIn(false);
        return;
      }

      if (!trimmedEmail) {
        setErrorMsg('Lütfen geçerli bir e-posta girin.');
        setIsLoggingIn(false);
        return;
      }

      if (isRegistering) {
        const reg = await localDb.registerWithPassword(trimmedEmail, password);
        if (reg.ok === false) {
          setErrorMsg(getLocalAuthMessage(reg.code, reg.message));
          setIsLoggingIn(false);
          return;
        }
        applyLocalSession(reg);
        navigate('/');
        return;
      }

      const localRes = await localDb.loginWithPassword(trimmedEmail, password);
      if (localRes.ok !== true) {
        if (localRes.code === 'local_user_not_found') {
          setErrorMsg(
            isStaff
              ? 'Bu e-posta veritabanında yok. Önce müşteri sayfasından kayıt olun; yönetici e-postası ile kayıt olan hesaplar personel paneline girebilir.'
              : 'Bu e-posta ile kayıtlı hesap yok. Bilgilerinizi kontrol edin veya hemen ücretsiz hesap oluşturun.'
          );
        } else {
          setErrorMsg(getLocalAuthMessage(localRes.code, localRes.message));
        }
        setIsLoggingIn(false);
        return;
      }

      if (isStaff) {
        const ok = await ensureStaffAccessLocal(localRes);
        if (!ok) {
          setErrorMsg(staffDeniedMsg);
          setIsLoggingIn(false);
          return;
        }
        applyLocalSession(localRes);
        navigate('/admin');
        return;
      }

      applyLocalSession(localRes);
      navigate('/');
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Beklenmeyen bir hata oluştu. Ağ ve API ayarlarını kontrol edin.');
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setErrorMsg(null);

    try {
      if (isStaff && demoEmail !== 'admin@harappe.com') {
        setErrorMsg('Personel girişi için yalnızca yetkili demo hesabı kullanılabilir.');
        setIsLoggingIn(false);
        return;
      }
      if (!isStaff && demoEmail === 'admin@harappe.com') {
        setErrorMsg('Yönetici hesabı için personel giriş sayfasını kullanın.');
        setIsLoggingIn(false);
        return;
      }

      const mockUid = demoEmail === 'admin@harappe.com' ? 'admin_demo_123' : 'user_demo_123';
      const mockUser: LocalSession = {
        uid: mockUid,
        email: demoEmail,
        displayName: demoEmail === 'admin@harappe.com' ? 'Admin' : 'Kerem Demo',
      };

      if (isStaff) {
        const ok = await ensureStaffAccessLocal(mockUser);
        if (!ok) {
          setErrorMsg(staffDeniedMsg);
          setIsLoggingIn(false);
          return;
        }
      }

      applyLocalSession(mockUser);
      setTimeout(() => {
        navigate(isStaff ? '/admin' : '/');
      }, 100);
    } catch (err: unknown) {
      console.error('Login Error:', err);
      setErrorMsg('Hızlı giriş başarısız.');
      setIsLoggingIn(false);
    }
  };

  if (isLoggingIn) {
    return (
      <LoadingView
        fullScreen
        message={
          isRegistering
            ? 'Harappe dünyasına hoş geldin...'
            : isStaff
              ? 'Personel paneline bağlanılıyor...'
              : 'Senin için her şeyi demliyoruz...'
        }
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-cream overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="coffee-card p-10 w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className={`text-white p-6 rounded-[2.5rem] inline-block mb-6 shadow-xl cursor-pointer ${
              isStaff ? 'bg-brand-dark shadow-brand-dark/20' : 'bg-brand-primary shadow-brand-primary/20'
            }`}
          >
            {isStaff ? <Settings size={44} /> : <Coffee size={44} />}
          </motion.div>
          <h1 className="text-4xl mb-1 tracking-tighter uppercase">
            {isStaff ? 'Personel Girişi' : isRegistering ? 'Yolculuğa Başla' : 'Harappe Giriş'}
          </h1>
          <p className="text-brand-dark/40 font-display font-medium text-[10px] uppercase tracking-widest leading-relaxed">
            {isStaff
              ? 'Yönetim ve hazırlık paneline erişim'
              : isRegistering
                ? 'Hemen Üye Ol ve Puan Kazan'
                : 'Favori Kahvelerine Bir Adım Kaldı'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3"
              >
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-red-800 text-[10px] font-bold uppercase tracking-wider">{errorMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 px-4">
              E-posta
            </label>
            <input
              type="email"
              placeholder={isStaff ? 'admin@harappe.com' : 'kahve@harappe.com'}
              className="w-full bg-brand-cream border-2 border-transparent p-4 rounded-2xl focus:border-brand-primary/20 focus:ring-0 transition-all font-medium text-sm"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 px-4">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full bg-brand-cream border-2 border-transparent p-4 pr-12 rounded-2xl focus:border-brand-primary/20 focus:ring-0 transition-all font-medium text-sm"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/20 hover:text-brand-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full primary-btn flex items-center justify-center gap-3 mt-4 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isRegistering ? 'Hesap Oluştur' : 'Giriş Yap'}
            {isRegistering ? (
              <UserPlus size={20} className="group-hover:translate-x-1 transition-transform" />
            ) : (
              <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </form>

        {!isRegistering && import.meta.env.DEV && (
          <div className="mt-10 pt-8 border-t border-brand-dark/5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark/20 text-center mb-6">
              Demo Girişi (yalnızca geliştirme, şifre gerekmez)
            </p>
            <div className="grid grid-cols-1 gap-3">
              {isStaff ? (
                <button
                  type="button"
                  onClick={() => void handleQuickLogin('admin@harappe.com')}
                  disabled={isLoggingIn}
                  className="flex flex-col items-center gap-2 bg-brand-cream p-4 rounded-2xl hover:bg-brand-primary/10 hover:text-brand-primary transition-all group border border-transparent hover:border-brand-primary/20"
                >
                  <Settings size={20} className="opacity-40 group-hover:opacity-100 group-hover:rotate-45 transition-all" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-dark/60">
                    Yönetici demo
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleQuickLogin('kerem@harappe.com')}
                  disabled={isLoggingIn}
                  className="flex flex-col items-center gap-2 bg-brand-cream p-4 rounded-2xl hover:bg-brand-primary/10 hover:text-brand-primary transition-all group border border-transparent hover:border-brand-primary/20"
                >
                  <Coffee size={20} className="opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-dark/60">
                    Müşteri demo
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 items-center text-center">
          {!isStaff && (
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-brand-primary font-black uppercase tracking-widest text-[10px] border-b-2 border-transparent hover:border-brand-primary transition-all pb-1"
            >
              {isRegistering ? 'Zaten üye misin? Giriş Yap' : 'Yeni bir yolculuk? Kayıt Ol'}
            </button>
          )}
          {isStaff ? (
            <Link
              to="/login"
              className="text-brand-dark/40 font-black uppercase tracking-widest text-[10px] hover:text-brand-primary transition-colors"
            >
              Müşteri girişi
            </Link>
          ) : (
            <Link
              to="/admin/login"
              className="text-brand-dark/40 font-black uppercase tracking-widest text-[10px] hover:text-brand-primary transition-colors"
            >
              Personel girişi
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginShell mode="customer" />;
}

export function StaffLoginPage() {
  return <LoginShell mode="staff" />;
}

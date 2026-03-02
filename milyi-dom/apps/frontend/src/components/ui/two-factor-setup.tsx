'use client';

import { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { api, parseError } from '../../lib/api-client';
import { Button } from './button';
import { Input } from './input';

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
}

export function TwoFactorSetup({ isEnabled, onStatusChange }: TwoFactorSetupProps) {
  const [phase, setPhase] = useState<'idle' | 'setup' | 'disable'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ secret: string; qrCode: string }>('/auth/2fa/setup');
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setPhase('setup');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async () => {
    if (token.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/2fa/enable', { token });
      toast.success('2FA включена');
      setPhase('idle');
      setToken('');
      setQrCode(null);
      setSecret(null);
      onStatusChange(true);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDisable = async () => {
    if (token.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { token });
      toast.success('2FA отключена');
      setPhase('idle');
      setToken('');
      onStatusChange(false);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  };

  // ── Idle state ─────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Двухфакторная аутентификация</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {isEnabled ? 'Включена — ваш аккаунт защищён дополнительно' : 'Отключена'}
            </p>
          </div>
          {isEnabled ? (
            <Button variant="danger" size="sm" onClick={() => setPhase('disable')}>
              Отключить
            </Button>
          ) : (
            <Button size="sm" onClick={startSetup} disabled={loading}>
              {loading ? 'Загрузка…' : 'Включить'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Setup flow ─────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="rounded-lg border p-4 space-y-4">
        <p className="font-medium">Настройка 2FA</p>
        <ol className="text-sm space-y-2 text-muted-foreground list-decimal pl-4">
          <li>Скачайте Google Authenticator или Яндекс.Ключ</li>
          <li>Отсканируйте QR-код или введите ключ вручную</li>
          <li>Введите 6-значный код для подтверждения</li>
        </ol>
        {qrCode && (
          <div className="flex justify-center">
            <Image src={qrCode} alt="QR-код для 2FA" width={180} height={180} unoptimized />
          </div>
        )}
        {secret && (
          <p className="text-center font-mono text-xs break-all bg-muted rounded p-2">
            {secret}
          </p>
        )}
        <Input
          placeholder="Код из приложения (6 цифр)"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          inputMode="numeric"
        />
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={confirmEnable}
            disabled={loading || token.length !== 6}
          >
            {loading ? 'Проверяем…' : 'Подтвердить'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPhase('idle');
              setToken('');
              setQrCode(null);
              setSecret(null);
            }}
          >
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  // ── Disable flow ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <p className="font-medium">Отключение 2FA</p>
      <p className="text-sm text-muted-foreground">
        Введите текущий код из приложения-аутентификатора для подтверждения.
      </p>
      <Input
        placeholder="Код из приложения (6 цифр)"
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
        maxLength={6}
        inputMode="numeric"
      />
      <div className="flex gap-2">
        <Button
          variant="danger"
          className="flex-1"
          onClick={confirmDisable}
          disabled={loading || token.length !== 6}
        >
          {loading ? 'Проверяем…' : 'Отключить 2FA'}
        </Button>
        <Button variant="outline" onClick={() => { setPhase('idle'); setToken(''); }}>
          Отмена
        </Button>
      </div>
    </div>
  );
}

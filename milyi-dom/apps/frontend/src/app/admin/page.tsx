"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { fetchTopHosts, verifyUser, promoteSuperhost } from '../../services/users';
import type { User } from '../../types/api';
import { parseError } from '../../lib/api-client';

export default function AdminPage() {
  const [hosts, setHosts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHosts = async () => {
    setLoading(true);
    try {
      const data = await fetchTopHosts(20);
      setHosts(data);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHosts();
  }, []);

  const handleVerify = async (userId: string) => {
    try {
      await verifyUser(userId);
      toast.success('User verified successfully.');
      await loadHosts();
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const handlePromote = async (userId: string) => {
    try {
      await promoteSuperhost(userId);
      toast.success('Host promoted to Superhost.');
      await loadHosts();
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  return (
    <RequireAuth roles={['ADMIN']}>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-xl px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Admin console</p>
            <h1 className="text-3xl font-serif text-slate-900">Host moderation</h1>
            <p className="text-sm text-slate-600">
              Review top performing hosts, approve verification requests and grant Superhost status.
            </p>
          </header>

          {loading ? (
            <div className="mt-10 space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-3xl" />
              ))}
            </div>
          ) : hosts.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-dashed border-pine-200 bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No hosts awaiting review</h2>
              <p className="mt-2 text-sm text-slate-500">All active hosts have already been reviewed.</p>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              {hosts.map((host) => (
                <article
                  key={host.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-soft"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{host.profile?.firstName ?? host.email}</p>
                    <p className="text-xs text-slate-500">
                      {host.email} | Languages: {host.profile?.languages?.join(', ') ?? 'not provided'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Verified: {host.isVerified ? 'yes' : 'no'} | Superhost: {host.isSuperhost ? 'yes' : 'no'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!host.isVerified && (
                      <Button variant="ghost" onClick={() => handleVerify(host.id)}>
                        Approve verification
                      </Button>
                    )}
                    {!host.isSuperhost && (
                      <Button variant="ghost" onClick={() => handlePromote(host.id)}>
                        Promote to Superhost
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

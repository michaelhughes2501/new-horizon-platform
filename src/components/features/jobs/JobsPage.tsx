// src/components/features/jobs/JobsPage.tsx
import React, { useEffect, useState } from 'react';
import { C, fonts } from '@styles/tokens';
import { jobApi } from '@lib/api';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import {
  Card,
  PageHeader,
  Badge,
  Button,
  Spinner,
  EmptyState,
  Modal,
  Field,
  inputStyle,
} from '@components/ui';
import type { Job, JobApplicationForm } from '@apptypes/app';

const EMPTY_FORM: JobApplicationForm = { name: '', email: '', phone: '', intro: '' };

export default function JobsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [jobs, setJobs]       = useState<Job[]>([]);
  const [saved, setSaved]     = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [form, setForm]         = useState<JobApplicationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    jobApi.getAll({ search }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      else { setError(null); setJobs(data ?? []); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [search]);

  useEffect(() => {
    if (user) jobApi.getSaved(user.id).then(({ data }) => setSaved(data ?? []));
  }, [user]);

  const toggleSave = async (jobId: string) => {
    if (!user) return;
    const { data, error } = await jobApi.toggleSave(user.id, jobId);
    if (error) { toast(error, 'error'); return; }
    setSaved(prev => (data ? [...prev, jobId] : prev.filter(x => x !== jobId)));
  };

  const submitApplication = async () => {
    if (!user || !applyJob) return;
    setSubmitting(true);
    const { error } = await jobApi.apply(user.id, applyJob.id, form);
    setSubmitting(false);
    if (error) { toast(error, 'error'); return; }
    toast('Application submitted.', 'success');
    setApplyJob(null);
    setForm(EMPTY_FORM);
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Felony-friendly listings with one-click applications"
        action={
          <input
            style={{ ...inputStyle, width: 220 }}
            placeholder="Search title or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner />
        </div>
      ) : error ? (
        <Card>
          <EmptyState
            icon="⬢"
            title="Job listings will appear here"
            text="Connect a live Supabase project to load the job board."
          />
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <EmptyState title="No jobs found" text="Try a different search." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(job => (
            <Card key={job.id}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ fontSize: 30 }}>{job.logo_emoji || '⬢'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: fonts.display, fontSize: 18, color: C.charcoal }}>
                      {job.title}
                    </span>
                    {job.felony_friendly && <Badge color={C.success}>Felony-friendly</Badge>}
                    {job.ban_the_box && <Badge color={C.info}>Ban-the-box</Badge>}
                  </div>
                  <div style={{ fontSize: 13, color: C.slate, marginTop: 2 }}>
                    {job.company} · {job.location} · {job.job_type}
                  </div>
                  {job.wage_display && (
                    <div style={{ fontSize: 13, color: C.success, marginTop: 4, fontWeight: 500 }}>
                      {job.wage_display}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button size="sm" onClick={() => { setApplyJob(job); setForm(EMPTY_FORM); }}>
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleSave(job.id)}
                  >
                    {saved.includes(job.id) ? '★ Saved' : '☆ Save'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!applyJob}
        onClose={() => setApplyJob(null)}
        title={applyJob ? `Apply — ${applyJob.title}` : 'Apply'}
      >
        <Field label="Full name">
          <input
            style={inputStyle}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            style={inputStyle}
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <input
            style={inputStyle}
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Short introduction">
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
            value={form.intro}
            onChange={e => setForm({ ...form, intro: e.target.value })}
          />
        </Field>
        <Button fullWidth size="lg" disabled={submitting} onClick={submitApplication}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </Button>
      </Modal>
    </div>
  );
}

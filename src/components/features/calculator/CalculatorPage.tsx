// src/components/features/calculator/CalculatorPage.tsx
import React, { useState } from 'react';
import { C, fonts } from '@styles/tokens';
import { calculatorApi } from '@lib/api';
import { Card, PageHeader, Button, Field, inputStyle, Badge } from '@components/ui';

const STATES = Object.keys(calculatorApi.SENTENCING_RULES);

type Result = NonNullable<ReturnType<typeof calculatorApi.calculate>>;

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CalculatorPage() {
  const [state, setState]     = useState(STATES[0]);
  const [years, setYears]     = useState('5');
  const [offense, setOffense] = useState<'non-violent' | 'violent'>('non-violent');
  const [start, setStart]     = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult]   = useState<Result | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const run = () => {
    setError(null);
    const y = parseFloat(years);
    if (isNaN(y) || y <= 0 || y > 100) {
      setError('Enter a sentence length between 1 and 100 years.');
      setResult(null);
      return;
    }
    const r = calculatorApi.calculate(state, y, offense, start);
    if (!r) {
      setError('No sentencing data for that state.');
      setResult(null);
      return;
    }
    setResult(r);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <PageHeader
        title="Sentence Calculator"
        subtitle="Estimate release windows using state good-time laws"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 18 }}>
        <Card>
          <Field label="State">
            <select style={inputStyle} value={state} onChange={e => setState(e.target.value)}>
              {STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Sentence length (years)">
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={years}
              onChange={e => setYears(e.target.value)}
            />
          </Field>

          <Field label="Offense category">
            <select
              style={inputStyle}
              value={offense}
              onChange={e => setOffense(e.target.value as 'non-violent' | 'violent')}
            >
              <option value="non-violent">Non-violent</option>
              <option value="violent">Violent</option>
            </select>
          </Field>

          <Field label="Sentence start date">
            <input
              style={inputStyle}
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </Field>

          <Button fullWidth size="lg" onClick={run}>
            Calculate
          </Button>

          {error && (
            <p style={{ color: C.rose, fontSize: 12, marginTop: 10 }}>{error}</p>
          )}

          <p style={{ fontSize: 11, color: C.slate, marginTop: 14 }}>
            Estimates only. Good-time credits vary by facility, conduct, and
            program participation. Always confirm with your attorney or case manager.
          </p>
        </Card>

        <div>
          {result ? (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 22, color: C.charcoal }}>
                  Estimated release
                </div>
                <Badge color={C.info}>{state}</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: C.successLight, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.slate }}>Earliest release</div>
                  <div style={{ fontFamily: fonts.display, fontSize: 19, color: C.success }}>
                    {fmtDate(result.earliestRelease)}
                  </div>
                </div>
                <div style={{ background: C.warnLight, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.slate }}>Latest release</div>
                  <div style={{ fontFamily: fonts.display, fontSize: 19, color: C.warn }}>
                    {fmtDate(result.latestRelease)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: C.slate }}>Time served</span>
                  <span style={{ color: C.charcoal, fontWeight: 500 }}>
                    {result.monthsServed} / {result.totalMonths} months
                  </span>
                </div>
                <div style={{ height: 8, background: C.mist, borderRadius: 9999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${result.percentServed}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>
                  {result.percentServed}% of full term served
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: C.slate,
                  background: C.cream,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                {result.stateNote}
              </div>
            </Card>
          ) : (
            <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
              <div style={{ textAlign: 'center', color: C.slate }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>∑</div>
                <div style={{ fontFamily: fonts.display, fontSize: 18, color: C.charcoal }}>
                  Enter details to calculate
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

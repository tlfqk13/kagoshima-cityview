#!/usr/bin/env python3
"""docs/proposal/hotels-ja.md → docs/proposal/print/hotels-print.html (A4 인쇄용).
부록A(메일 예문)는 발송용 도구라 인쇄본에서 제외한다. PDF는 이 HTML을 Playwright로 인쇄한다:
  python3 scripts/build-hotel-proposal.py && node -e "..." (README 참고) 또는 npm run proposal:pdf
"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
MD = ROOT / 'docs/proposal/hotels-ja.md'
HTML = ROOT / 'docs/proposal/print/hotels-print.html'

def inl(t): return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)

def build():
    s = MD.read_text()
    main = s.split('## 附録A')[0]; appB = s.split('## 附録B')[1]
    lines = main.split('\n'); title = lines[0][2:].strip()
    meta, out = [], []; lst = [None]; lead = [False]
    def close():
        if lst[0]: out.append(f'  </{lst[0]}>'); lst[0] = None
    for ln in lines[1:]:
        ln = ln.rstrip()
        m = re.match(r'^\*\*(宛先|日付|提案者):\*\*\s*(.*)$', ln)
        if m: meta.append(f'    <p><span class="label">{m.group(1)}</span>{inl(m.group(2))}</p>'); continue
        if not ln or ln == '---': close(); continue
        if ln.startswith('## '): close(); out.append(f'  <h2>{ln[3:]}</h2>'); continue
        if ln.startswith('- '):
            if lst[0] != 'ul': close(); lst[0] = 'ul'; out.append('  <ul>')
            out.append(f'    <li>{inl(ln[2:])}</li>'); continue
        m = re.match(r'^\d+\. (.*)$', ln)
        if m:
            if lst[0] != 'ol': close(); lst[0] = 'ol'; out.append('  <ol>')
            out.append(f'    <li>{inl(m.group(1))}</li>'); continue
        close(); cls = '' if lead[0] else ' class="lead"'; lead[0] = True; out.append(f'  <p{cls}>{inl(ln)}</p>')
    close()
    rows = [l for l in appB.split('\n') if l.startswith('| ') and not l.startswith('| ホテル') and not l.startswith('|---')]
    note = [l for l in appB.split('\n') if l.startswith('> ')][0][2:]
    table = ('  <h2>附録: 主要ホテル最寄り停留所（2026年7月調べ）</h2>\n  <table>\n    <tr><th>ホテル</th><th>最寄り停留所</th><th>直線距離</th></tr>\n'
             + ''.join('    <tr>' + ''.join(f'<td>{c.strip()}</td>' for c in r.strip().strip('|').split('|')) + '</tr>\n' for r in rows)
             + f'  </table>\n  <p style="font-size:9pt; color:#555;">※ {note}</p>')
    head = HTML.read_text().split('<body>')[0]
    head = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', head)
    doc = (head + '<body>\n  <h1>' + title.replace('設置のご提案', '<br>設置のご提案') + '</h1>\n\n  <div class="meta">\n'
           + '\n'.join(meta) + '\n  </div>\n\n' + '\n'.join(out) + '\n\n' + table + '\n</body>\n</html>\n')
    HTML.write_text(doc)
    print('wrote', HTML.relative_to(ROOT))

if __name__ == '__main__':
    build()

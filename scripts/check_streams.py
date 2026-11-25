#!/usr/bin/env python3
"""Проверка серверов Bulgaria TV: для каждого канала берёт ссылку у воркера, скачивает плейлист и один сегмент.

Запуск:   python3 scripts/check_streams.py                (проверка с этой машины)
          python3 scripts/check_streams.py --iface en0    (из домашней сети мимо VPN, только macOS/Linux с curl)
Выход:    0 — всё хорошо или один неисправный канал; 1 — два и больше неисправных каналов, мёртвый узел или не отвечает воркер.
Результат: таблица в stdout и в $GITHUB_STEP_SUMMARY, подробности в status.json.
Только стандартная библиотека и curl. GitHub Actions считает из США, поэтому узлы, недоступные из РФ (как us.glebul.com),
так не поймать: для этого запускай с --iface из домашней сети.
"""
import argparse, concurrent.futures as cf, json, os, re, subprocess, sys, time
from collections import defaultdict
from urllib.parse import urljoin

UA = 'AppleCoreMedia/1.0.0'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def curl(url, iface, timeout, out='-'):
    cmd = ['curl', '-s', '-m', str(timeout), '-A', UA, '-w', '\n%{http_code} %{size_download} %{time_total}']
    if iface: cmd += ['--interface', iface]
    cmd += ['-o', out, url]
    r = subprocess.run(cmd, capture_output=True, text=True)
    body, _, meta = r.stdout.rpartition('\n')
    parts = meta.split()
    code = int(parts[0]) if parts and parts[0].isdigit() else 0
    return code, body if out == '-' else '', (int(parts[1]) if len(parts) > 1 else 0), (float(parts[2]) if len(parts) > 2 else 0.0)

def try_twice(fn):
    last = None
    for i in range(2):
        last = fn()
        if last[0]: return last
        time.sleep(1.5)
    return last

def channel_ids():
    s = open(os.path.join(ROOT, 'index.html'), encoding='utf8').read()
    return re.findall(r"\{ id:'(\w+)'", s)

def check(cid, worker, iface):
    res = {'id': cid, 'host': '', 'ok': False, 'why': '', 'seg_bytes': 0, 'seg_s': 0.0}
    code, body, _, _ = try_twice(lambda: curl(f'{worker}/stream?channel={cid}', None, 20))
    try: url = json.loads(body)['url']
    except Exception:
        res['why'] = f'воркер: http {code}'; return res
    res['host'] = re.sub(r'https?://([^/]+)/.*', r'\1', url)
    pl = url
    for _ in range(3):
        code, body, _, _ = try_twice(lambda: (lambda c: (c[0] if c[0] == 200 and '#EXTM3U' in c[1] else 0, c[1], c[2], c[3]))(curl(pl, iface, 12)))
        if not code:
            res['why'] = 'плейлист не открылся'; return res
        lines = [l.strip() for l in body.splitlines() if l.strip() and not l.startswith('#')]
        if not lines:
            res['why'] = 'плейлист пуст'; return res
        nxt = urljoin(pl, lines[0])
        if '?' not in nxt and '?' in pl: nxt += '?' + pl.split('?', 1)[1]
        if nxt.split('?')[0].endswith('.m3u8'): pl = nxt; continue
        code, _, size, secs = try_twice(lambda: (lambda c: (c[0] if c[0] == 200 and c[2] > 50000 else 0, '', c[2], c[3]))(curl(nxt, iface, 20, out=os.devnull)))
        res['seg_bytes'], res['seg_s'] = size, secs
        if code: res['ok'] = True
        else: res['why'] = f'сегмент не скачался ({size} Б)'
        return res
    res['why'] = 'слишком много вложенных плейлистов'; return res

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--worker', default='https://bulgaria-worker.dyaltd.workers.dev')
    ap.add_argument('--iface', default='')
    ap.add_argument('--json', default=os.path.join(ROOT, 'status.json'))
    a = ap.parse_args()
    ids = channel_ids()
    with cf.ThreadPoolExecutor(max_workers=5) as ex:
        results = list(ex.map(lambda c: check(c, a.worker, a.iface), ids))
    bad = [r for r in results if not r['ok']]
    by_host = defaultdict(lambda: [0, 0])
    for r in results:
        by_host[r['host'] or '(нет ссылки)'][0 if r['ok'] else 1] += 1
    dead_hosts = [h for h, (ok, fail) in by_host.items() if fail >= 2 and ok == 0]
    where = f'через {a.iface}' if a.iface else 'с этой машины'
    lines = [f'## Серверы Bulgaria TV: {len(results) - len(bad)} из {len(results)} каналов играют ({where})', '', '| Узел | Работает | Не работает |', '|---|---|---|']
    for h, (ok, fail) in sorted(by_host.items()): lines.append(f'| {h} | {ok} | {fail} |')
    if bad:
        lines += ['', '| Канал | Узел | Причина |', '|---|---|---|'] + [f"| {r['id']} | {r['host']} | {r['why']} |" for r in bad]
    text = '\n'.join(lines)
    print(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf8').write(text + '\n')
    json.dump({'checked_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'where': where, 'hosts': {h: {'ok': v[0], 'fail': v[1]} for h, v in by_host.items()}, 'channels': results}, open(a.json, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    if len(bad) == 1: print(f"::warning::Не играет канал {bad[0]['id']}: {bad[0]['why']}")
    problem = len(bad) >= 2 or dead_hosts or any(r['why'].startswith('воркер') for r in results)
    if dead_hosts: print('::error::Мёртвый узел: ' + ', '.join(dead_hosts))
    if problem: print(f'::error::Не играют каналы: {", ".join(r["id"] for r in bad)}')
    sys.exit(1 if problem else 0)

if __name__ == '__main__':
    main()

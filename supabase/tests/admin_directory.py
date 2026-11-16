#!/usr/bin/env python3
"""Run reporting/privilege checks in a disposable PostgreSQL database only."""
import os
import pathlib
import shutil
import subprocess
import tempfile

REPO = pathlib.Path(__file__).resolve().parents[2]
binary = pathlib.Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))
base = pathlib.Path(tempfile.mkdtemp(prefix='tms-directory-pg.', dir='/private/tmp'))
socket = base / 'socket'
socket.mkdir()
started = False


def run(args):
    result = subprocess.run([str(arg) for arg in args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-5000:] + result.stdout[-1000:])
    return result.stdout


try:
    run([binary / 'initdb', '-D', base / 'data', '-A', 'trust', '--no-locale'])
    run([binary / 'pg_ctl', '-D', base / 'data', '-l', base / 'postgres.log',
         '-o', f"-k {socket} -h '' -p 55439", '-w', 'start'])
    started = True
    psql = [binary / 'psql', '-h', socket, '-p', '55439', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
    run(psql + ['-f', REPO / 'supabase/tests/fixtures/admin_directory_schema.sql'])
    migration = REPO / 'supabase/migrations/20261112130924_admin_customer_cart_reporting.sql'
    for attempt in range(2):
        run(psql + ['-f', migration])
        run(psql + ['-f', REPO / 'supabase/tests/admin_customer_cart_reporting.sql'])
        print(f'PASS: customer/cart reporting, Auth email search, pagination, large order totals, IST dates, service-only privileges; application {attempt + 1}')
    for role in ['anon', 'authenticated']:
        result = subprocess.run([str(arg) for arg in psql + ['-c', f'SET ROLE {role}; SELECT public.admin_customer_directory();']], capture_output=True, text=True)
        assert result.returncode != 0 and 'permission denied' in result.stderr
    print('PASS: anonymous and authenticated report calls denied')
finally:
    if started:
        subprocess.run([str(binary / 'pg_ctl'), '-D', str(base / 'data'), '-m', 'immediate', '-w', 'stop'], capture_output=True)
    shutil.rmtree(base)

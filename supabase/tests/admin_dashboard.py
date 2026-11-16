#!/usr/bin/env python3
"""Read-only dashboard checks in a disposable local PostgreSQL cluster."""
import os
import pathlib
import shutil
import subprocess
import tempfile

repo = pathlib.Path(__file__).resolve().parents[2]
binary = pathlib.Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))
base = pathlib.Path(tempfile.mkdtemp(prefix='tms-dashboard-pg.', dir='/private/tmp'))
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
    run([binary / 'pg_ctl', '-D', base / 'data', '-l', base / 'postgres.log', '-o', f"-k {socket} -h '' -p 55440", '-w', 'start'])
    started = True
    psql = [binary / 'psql', '-h', socket, '-p', '55440', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
    for fixture in ['admin_directory_schema.sql', 'admin_dashboard_schema.sql']:
        run(psql + ['-f', repo / 'supabase/tests/fixtures' / fixture])
    for attempt in range(2):
        run(psql + ['-f', repo / 'supabase/migrations/20261113094113_admin_dashboard_reporting.sql'])
        run(psql + ['-f', repo / 'supabase/migrations/20261113102331_fix_dashboard_activity_business_name.sql'])
        run(psql + ['-f', repo / 'supabase/tests/admin_dashboard.sql'])
        print(f'PASS: IST/equal periods, payment/refund balances, pickup fulfilment, live queues, exact quick view, large data, privileges; application {attempt + 1}')
    # Reproduce the actual deployed bug, then repair that existing definition.
    legacy = (repo / 'supabase/migrations/20261113094113_admin_dashboard_reporting.sql').read_text().replace('business_name AS name', 'company_name AS name')
    legacy_file = base / 'legacy-report.sql'
    legacy_file.write_text(legacy)
    run(psql + ['-f', legacy_file])
    failed = subprocess.run([str(arg) for arg in psql + ['-c', "SELECT admin_dashboard_section('activity','2026-11-12','2026-11-13');"]], capture_output=True, text=True)
    assert failed.returncode != 0 and 'company_name' in failed.stderr
    for attempt in range(2):
        run(psql + ['-f', repo / 'supabase/migrations/20261113102331_fix_dashboard_activity_business_name.sql'])
        run(psql + ['-f', repo / 'supabase/tests/admin_dashboard.sql'])
    print('PASS: deployed company_name error reproduced; corrective migration and reapplication restore activity')
    for role in ['anon', 'authenticated']:
        result = subprocess.run([str(arg) for arg in psql + ['-c', f"SET ROLE {role}; SELECT admin_dashboard_section('inventory','2026-11-12','2026-11-13');"]], capture_output=True, text=True)
        assert result.returncode != 0 and 'permission denied' in result.stderr
    print('PASS: direct anonymous/authenticated reporting denied')
finally:
    if started:
        subprocess.run([str(binary / 'pg_ctl'), '-D', str(base / 'data'), '-m', 'immediate', '-w', 'stop'], capture_output=True)
    shutil.rmtree(base)

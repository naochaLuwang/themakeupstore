#!/usr/bin/env python3
"""Run reporting/privilege checks in a disposable PostgreSQL database only."""
import os
import pathlib
import shutil
import subprocess
import tempfile

REPO = pathlib.Path(__file__).resolve().parents[2]
binary = pathlib.Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))
base = pathlib.Path(tempfile.mkdtemp(prefix='tms-reward-users-pg.', dir='/private/tmp'))
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
         '-o', f"-k {socket} -h '' -p 55446", '-w', 'start'])
    started = True
    psql = [binary / 'psql', '-h', socket, '-p', '55446', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
    for file in ['supabase/tests/fixtures/financial_schema.sql','supabase/tests/fixtures/reward_users_schema.sql','supabase/migrations/20260706_create_loyalty_rewards.sql','supabase/migrations/20260901_fix_loyalty_pending_balance.sql','supabase/migrations/20260706_create_gift_cards.sql','supabase/migrations/20261030072928_financial_checkout_security.sql']:
        run(psql+['-f',REPO/file])
    migration = REPO / 'supabase/migrations/20261113123408_rewards_users_security.sql'
    for attempt in range(2):
        run(psql + ['-f', migration])
        run(psql + ['-f', REPO / 'supabase/tests/reward_users.sql'])
        print(f'PASS: reward credit exact-once accounting, audit rollback, erasure, full reporting, permissions and profile upsert; application {attempt + 1}')
    for role in ['anon', 'authenticated']:
        result = subprocess.run([str(arg) for arg in psql + ['-c', f'SET ROLE {role}; SELECT public.admin_reward_users();']], capture_output=True, text=True)
        assert result.returncode != 0 and 'permission denied' in result.stderr
    print('PASS: anonymous and authenticated report calls denied')
    for table in ['profiles','orders','order_items','loyalty_points','loyalty_transactions','loyalty_admin_credits']:
        assert run(psql+['-Atc',f"SELECT NOT has_table_privilege('anon','public.{table}','SELECT')"]).strip()=='t',table
    run(psql+['-f',REPO/'supabase/tests/financial_checkout_security.sql'])
    print('PASS: existing financial checkout, release, refund and privilege assertions with repaired loyalty triggers')
    environment={**os.environ,'TMS_TEST_PG_SOCKET':str(socket),'TMS_TEST_PG_PORT':'55446','TMS_TEST_PSQL':str(binary/'psql')}
    for script in ['financial_concurrency.py','reward_users_concurrency.py']:
        result=subprocess.run(['python3',str(REPO/'supabase/tests'/script)],env=environment,capture_output=True,text=True)
        if result.returncode: raise RuntimeError(result.stderr+result.stdout)
        print(result.stdout.strip())
    for file in ['supabase/migrations/20260716_add_partial_refund.sql','supabase/tests/fixtures/promotion_schema.sql','supabase/migrations/20261031083633_promotion_rules_and_order_allocations.sql']:
        run(psql+['-f',REPO/file])
    run(psql+['-f',REPO/'supabase/tests/promotion_checkout.sql'])
    print('PASS: promotion checkout, credit-funded cancellation and item refund assertions with repaired triggers')
    for file in ['supabase/migrations/20261102101444_bxgy_discount_pricing_mode.sql','supabase/tests/fixtures/order_edit_schema.sql','supabase/migrations/20261110173320_admin_order_amendments.sql']:
        run(psql+['-f',REPO/file])
    run(psql+['-f',migration])
    environment.update({'TMS_ORDER_EDIT_PG_SOCKET':str(socket),'TMS_ORDER_EDIT_PG_PORT':'55446'})
    result=subprocess.run(['python3',str(REPO/'supabase/tests/order_amendments.py')],env=environment,capture_output=True,text=True)
    if result.returncode: raise RuntimeError(result.stderr+result.stdout)
    print(result.stdout.strip())


finally:
    if started:
        subprocess.run([str(binary / 'pg_ctl'), '-D', str(base / 'data'), '-m', 'immediate', '-w', 'stop'], capture_output=True)
    shutil.rmtree(base)

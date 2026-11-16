#!/usr/bin/env python3
"""Run reporting/privilege checks in a disposable PostgreSQL database only."""
import os
import pathlib
import shutil
import subprocess
import tempfile
import concurrent.futures
import json
import threading
import uuid

REPO = pathlib.Path(__file__).resolve().parents[2]
binary = pathlib.Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))
base = pathlib.Path(tempfile.mkdtemp(prefix='tms-purchase-pg.', dir='/private/tmp'))
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
         '-o', f"-k {socket} -h '' -p 55443", '-w', 'start'])
    started = True
    psql = [binary / 'psql', '-h', socket, '-p', '55443', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
    run(psql + ['-f', REPO / 'supabase/tests/fixtures/purchase_schema.sql'])
    migration = REPO / 'supabase/migrations/20261113111400_purchase_management_controls.sql'
    for attempt in range(2):
        run(psql + ['-f', migration])
        run(psql + ['-f', REPO / 'supabase/tests/purchases.sql'])
        print(f'PASS: purchase saves, receipts, costs, rollback, legacy baseline and pagination; application {attempt + 1}')
    for role in ['anon', 'authenticated']:
        result = subprocess.run([str(arg) for arg in psql + ['-c', f'SET ROLE {role}; SELECT public.admin_purchase_list();']], capture_output=True, text=True)
        assert result.returncode != 0 and 'permission denied' in result.stderr
    print('PASS: anonymous and authenticated RPC calls denied')
    for table in ['suppliers','purchase_orders','purchase_order_items','stock_ledger','purchase_receipts','purchase_events']:
        denied=run(psql+['-Atc',f"SELECT NOT has_table_privilege('anon','public.{table}','SELECT') AND NOT has_table_privilege('authenticated','public.{table}','UPDATE')"])
        assert denied.strip()=='t', table
    print('PASS: anonymous reads and direct client mutations revoked; POS ledger insert retained')
    for role_id, expected in [('10000000-0000-0000-0000-000000000002',0),('10000000-0000-0000-0000-000000000001',1)]:
        output=run(psql+['-Atc',f"SET ROLE authenticated; SET request.jwt.claim.sub='{role_id}'; SELECT count(*) FROM public.purchase_orders;"])
        assert output.strip().splitlines()[-1]==str(expected)
    print('PASS: customer reads zero purchase rows; admin reads historical order through RLS')
    actor='10000000-0000-0000-0000-000000000001'
    variant='40000000-0000-0000-0000-000000000002'
    def scalar(sql):
        return run(psql+['-Atc',sql]).strip().splitlines()[-1]
    def stock():
        return int(scalar(f"SELECT stock FROM public.product_variants WHERE id='{variant}'"))
    def pair(first,second):
        barrier=threading.Barrier(2)
        def execute(sql):
            barrier.wait()
            try:
                run(psql+['-c',sql]); return True
            except RuntimeError as error:
                assert 'Purchase changed' in str(error),str(error)
                return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(execute,sql) for sql in [first,second]]
            return [future.result() for future in futures]
    def draft(po):
        body=json.dumps({'supplier_id':'20000000-0000-0000-0000-000000000001','items':[{'variant_id':variant,'quantity':4,'unit_cost':50}]})
        return f"SELECT public.admin_purchase_save('{po}',0,'{body}'::jsonb,'{actor}')"
    def ordered():
        po=str(uuid.uuid4()); scalar(draft(po)); scalar(f"SELECT public.admin_purchase_transition('{po}',1,'ordered','{actor}')")
        item=scalar(f"SELECT id FROM public.purchase_order_items WHERE purchase_order_id='{po}'")
        return po,item
    def receive(po,item,receipt,qty):
        body=json.dumps({'received_on':scalar("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date"),'lines':[{'item_id':item,'accepted':qty,'damaged':0}]})
        return f"SELECT public.admin_purchase_receive('{po}',2,'{receipt}','{body}'::jsonb,'{actor}')"
    po=str(uuid.uuid4()); assert pair(draft(po),draft(po))==[True,True]
    assert scalar(f"SELECT count(*) FROM public.purchase_order_items WHERE purchase_order_id='{po}'")=='1'
    po,item=ordered(); before=stock()
    assert sorted(pair(receive(po,item,str(uuid.uuid4()),1),receive(po,item,str(uuid.uuid4()),1)))==[False,True]
    assert stock()==before+1
    po,item=ordered(); before=stock(); receipt=str(uuid.uuid4()); sql=receive(po,item,receipt,4)
    assert pair(sql,sql)==[True,True] and stock()==before+4
    assert scalar(f"SELECT count(*) FROM public.stock_ledger WHERE reference_id='{receipt}'")=='1'
    po,item=ordered(); before=stock()
    assert pair(receive(po,item,str(uuid.uuid4()),4),f"UPDATE public.product_variants SET stock=stock-2 WHERE id='{variant}'")==[True,True]
    assert stock()==before+2
    print('PASS: concurrent duplicate creates, conflicting receipts, same-receipt retries and atomic sale/receipt stock updates')
finally:
    if started:
        subprocess.run([str(binary / 'pg_ctl'), '-D', str(base / 'data'), '-m', 'immediate', '-w', 'stop'], capture_output=True)
    shutil.rmtree(base)

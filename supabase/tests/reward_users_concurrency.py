"""Synthetic credit/ledger races; only the disposable rewards cluster is accepted."""
import concurrent.futures
import os
import subprocess
import threading
import uuid
socket=os.environ['TMS_TEST_PG_SOCKET']
assert socket.startswith('/private/tmp/tms-reward-users-pg.')
psql=[os.environ['TMS_TEST_PSQL'],'-h',socket,'-p',os.environ['TMS_TEST_PG_PORT'],'-d','postgres','-qAt','-v','ON_ERROR_STOP=1']
actor='99999999-0000-4000-8000-000000000001'
def query(sql,check=True):
    result=subprocess.run(psql,input='SET ROLE service_role;\n'+sql,text=True,capture_output=True)
    if check and result.returncode: raise AssertionError(result.stderr)
    return result

def scalar(sql): return query(sql).stdout.strip()
def user():
    ident=str(uuid.uuid4())
    query(f"INSERT INTO profiles(id) VALUES('{ident}'); INSERT INTO loyalty_points(user_id,balance,lifetime_earned) VALUES('{ident}',100,100)")
    return ident

def credit(ident,request=None,amount=50):
    return f"SELECT credit_reward_user('{request or uuid.uuid4()}','{ident}','{actor}',{amount},'Concurrent fixture',100)"

def pair(first,second):
    barrier=threading.Barrier(2)
    def execute(sql):
        barrier.wait(); result=query(sql,False)
        if result.returncode: assert any(message in result.stderr for message in ['Balance changed','Customer no longer exists']),result.stderr
        return result.returncode==0
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures=[pool.submit(execute,sql) for sql in [first,second]]
        return [future.result() for future in futures]

ident=user(); request=str(uuid.uuid4())
assert pair(credit(ident,request),credit(ident,request))==[True,True]
assert scalar(f"SELECT balance||','||lifetime_earned FROM loyalty_points WHERE user_id='{ident}'")=='150,150'
assert scalar(f"SELECT count(*) FROM loyalty_admin_credits WHERE user_id='{ident}'")=='1'
print('PASS: two identical credit retries commit one audited credit')
ident=user()
assert sorted(pair(credit(ident,amount=10),credit(ident,amount=20)))==[False,True]
assert scalar(f"SELECT count(*) FROM loyalty_admin_credits WHERE user_id='{ident}'")=='1'
print('PASS: different concurrent credits require a new review of the changed balance')
ident=user()
def insert(amount,kind='bonus'):
    return f"INSERT INTO loyalty_transactions(user_id,type,amount,status) VALUES('{ident}','{kind}',{amount},'available')"
assert pair(insert(10),insert(20))==[True,True]
assert scalar(f"SELECT balance||','||lifetime_earned FROM loyalty_points WHERE user_id='{ident}'")=='130,130'
print('PASS: independent concurrent ledger credits preserve both increments')
ident=user()
results=pair(credit(ident),insert(40,'spend'))
bonus=int(scalar(f"SELECT COALESCE(sum(amount),0) FROM loyalty_transactions WHERE user_id='{ident}' AND type='bonus'"))
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{ident}'")==str(100+bonus-40)
print('PASS: credit versus spend either preserves both amounts or rejects a stale credit review')
ident=user()
pair(credit(ident),f"UPDATE profiles SET deleted_at=now() WHERE id='{ident}'")
assert scalar(f"SELECT count(*) FROM loyalty_transactions WHERE user_id='{ident}'")=='0'
assert scalar(f"SELECT count(*) FROM loyalty_admin_credits WHERE user_id='{ident}'")=='0'
assert scalar(f"SELECT count(*) FROM loyalty_points WHERE user_id='{ident}'")=='0'
print('PASS: overlapping credit and deletion leave no reward records for a deleted customer')

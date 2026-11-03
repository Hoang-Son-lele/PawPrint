const { test }=require('node:test');
const assert=require('node:assert/strict');
test('owner profile CRUD, avatar upload and pet avatar ownership', {skip:process.env.RUN_SQL_TESTS!=='1'},async()=>{
  const {randomUUID}=require('node:crypto');
  const jwt=require('jsonwebtoken');
  const env=require('../src/config/env');
  const {sql,getPool}=require('../src/config/db');
  const media=require('../src/services/media.service');
  const original=media.uploadPhoto;
  media.uploadPhoto=async()=>({secure_url:'https://example.invalid/avatar.png'});
  const pool=await getPool(),app=require('../src/app');
  const owner=randomUUID(),other=randomUUID(),staff=randomUUID();
  let pet;
  const server=app.listen(0,'127.0.0.1');
  await new Promise(r=>server.listening?r():server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  async function call(path,actor=owner,method='GET',body){
    const form=body instanceof FormData;
    const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${jwt.sign({},env.jwtSecret,{subject:actor,expiresIn:'5m'})}`,...(!form?{'Content-Type':'application/json'}:{})},...(body?{body:form?body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json()};
  }
  try{
    for(const [id,role] of [[owner,'owner'],[other,'owner'],[staff,'staff']])
      await pool.request().input('id',sql.UniqueIdentifier,id).input('role',sql.NVarChar(20),role)
        .input('email',sql.NVarChar(254),`${id}@profile-test.invalid`)
        .query("INSERT dbo.Users(Id,Email,PasswordHash,Role) VALUES(@id,@email,'unused',@role)");
    assert.equal((await call('/profile')).body.exists,false);
    const form=new FormData();form.append('file',new Blob([Buffer.from([137,80,78,71,13,10,26,10])],{type:'image/png'}),'avatar.png');
    const upload=await call('/profile/avatar',owner,'POST',form);
    assert.equal(upload.status,200);
    const profile={displayName:'Test owner',phone:'+84 901234567',bio:'My pets',avatarUrl:upload.body.avatarUrl,role:'admin',id:other};
    assert.equal((await call('/profile',owner,'POST',profile)).status,201);
    assert.equal((await call('/profile',owner,'POST',profile)).status,409);
    assert.equal((await call('/profile')).body.profile.avatarUrl,profile.avatarUrl);
    assert.equal((await call('/profile',other)).body.exists,false);
    const me=await call('/auth/me');
    assert.equal(me.body.user.role,'owner');
    assert.equal(me.body.user.avatarUrl,profile.avatarUrl);
    assert.equal((await call('/profile',owner,'PATCH',{...profile,displayName:'Updated'})).status,200);
    assert.equal((await call('/profile',owner,'PATCH',{...profile,avatarUrl:'http://bad.example/avatar'})).status,400);
    assert.equal((await call('/profile',owner,'PATCH',{...profile,displayName:' '})).status,400);
    assert.equal((await call('/profile',staff)).status,403);
    assert.equal((await call('/profile',staff,'POST',profile)).status,403);
    const created=await call('/pets',owner,'POST',{name:'Miu',species:'cat',avatarUrl:profile.avatarUrl});
    assert.equal(created.status,201);pet=created.body.pet.id;
    assert.equal(created.body.pet.avatarUrl,profile.avatarUrl);
    assert.equal((await call(`/pets/${pet}`,other,'PATCH',{avatarUrl:'https://example.invalid/other.png'})).status,404);
    assert.equal((await call(`/pets/${pet}`,owner,'PATCH',{avatarUrl:'javascript:alert(1)'})).status,400);
    assert.equal((await call(`/pets/${pet}`,owner,'PATCH',{avatarUrl:'https://example.invalid/new.png'})).status,200);
    assert.equal((await call('/profile',owner,'DELETE')).status,200);
    assert.equal((await call('/profile')).body.exists,false);
    assert.equal((await call('/auth/me')).status,200);
    assert.equal((await call(`/pets/${pet}`)).status,200);
    assert.equal((await call('/profile',owner,'POST',profile)).status,201);
    assert.equal((await call(`/pets/${pet}`,owner,'DELETE')).status,200);
    assert.equal((await call(`/pets/${pet}`)).status,404);
  }finally{
    media.uploadPhoto=original;
    await new Promise(r=>server.close(r));
    await pool.request().input('a',sql.UniqueIdentifier,owner).input('b',sql.UniqueIdentifier,other).input('c',sql.UniqueIdentifier,staff)
      .query('DELETE dbo.Pets WHERE UserId IN(@a,@b,@c); DELETE dbo.RefreshSessions WHERE UserId IN(@a,@b,@c); DELETE dbo.Users WHERE Id IN(@a,@b,@c);');
    await pool.close();
  }
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {errorHandler}=require('../src/middlewares/errors');
const {HttpError}=require('../src/utils/http');
test('configuration errors reach the UI without exposing unexpected server errors',()=>{
  let status,payload;
  const res={status(value){status=value;return this;},json(value){payload=value;return this;}};
  const oldLog=console.error;console.error=()=>{};
  try{
    errorHandler(new HttpError(503,'Cloudinary is not configured'),{},res,()=>{});
    assert.equal(status,503);assert.equal(payload.message,'Cloudinary is not configured');
    errorHandler(new Error('private database details'),{},res,()=>{});
    assert.equal(status,500);assert.equal(payload.message.includes('private database details'),false);
  }finally{console.error=oldLog;}
});

require('dotenv').config();
const {createHash}=require('node:crypto');
const {sql,getPool}=require('../src/config/db');
const {getCloudinary}=require('../src/config/cloudinary');
const {photoUrl}=require('../src/services/media.service');
const email=process.argv[2];
if(!email) throw Error('Pass target email as argument');
const id=(key)=>{let h=createHash('sha256').update('pawprint-demo-v1:'+email+':'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
(async()=>{
 const pool=await getPool();
 try {
 const user=(await pool.request().input('email',email).query('SELECT Id FROM dbo.Users WHERE Email=@email AND IsActive=1')).recordset[0];
 if(!user) throw Error('Target account not found');
 const products=(await pool.request().query("SELECT Id,Name,Price,ImageUrl FROM dbo.Products WHERE Id IN ('ca7d0000-0000-4000-8000-000000000001','ca7d0000-0000-4000-8000-000000000004') ORDER BY Name")).recordset;
 if(products.length!==2) throw Error('Run seed-cute-pets.js first');
 const cloud=getCloudinary();
 const assets=[];
 for(let i=0;i<2;i++){
 const a=await cloud.uploader.upload(products[i].ImageUrl,{public_id:`pawprint/demo-journal/${id('pet'+i)}`,type:'authenticated',overwrite:false});
 const asset=a.format?a:await cloud.api.resource(a.public_id,{type:'authenticated'});
 const response=await fetch(photoUrl({storageKey:asset.public_id,format:asset.format}));
 if(!response.ok) throw Error('Private moment image unavailable');
 await response.arrayBuffer(); assets.push(asset);
 }
 const tx=new sql.Transaction(pool);await tx.begin();
 const q=async(query,params={})=>{const r=new sql.Request(tx);r.input('user',sql.UniqueIdentifier,user.Id);for(const [k,v]of Object.entries(params))r.input(k,v);return r.query(query);};
 try{
 await q("UPDATE dbo.Users SET DisplayName=COALESCE(NULLIF(DisplayName,''),N'Minh Tâm'),Bio=COALESCE(NULLIF(Bio,''),N'Góc nhỏ lưu giữ hành trình cùng Bông và Mochi 🐾 — hồ sơ mẫu'),AvatarUrl=COALESCE(NULLIF(AvatarUrl,''),@url),ProfileCreatedAt=COALESCE(ProfileCreatedAt,SYSUTCDATETIME()) WHERE Id=@user",{url:products[0].ImageUrl});
 for(let i=0;i<2;i++){
 const pet=id('pet'+i), name=i?'Mochi':'Bông';
 await q(`IF NOT EXISTS(SELECT 1 FROM dbo.Pets WHERE Id=@id) INSERT dbo.Pets(Id,UserId,Name,Species,Sex,BirthDate,AdoptedAt,WeightKg,Notes,AvatarUrl,CreatedAt) VALUES(@id,@user,@name,@species,@sex,'2026-03-01','2026-08-01',@weight,N'Hồ sơ thú cưng mẫu để khám phá PawPrint.',@url,'2026-08-01')`,{id:pet,name,species:i?'cat':'dog',sex:i?'female':'male',weight:i?3.2:8.4,url:products[i].ImageUrl});
 for(let j=0;j<6;j++){
 const date=['2026-10-05','2026-10-12','2026-10-20','2026-11-01','2026-11-02','2026-11-03'][j];
 const mid=id(`moment${i}-${j}`);
 await q(`IF NOT EXISTS(SELECT 1 FROM dbo.Moments WHERE Id=@id) BEGIN INSERT dbo.Moments(Id,PetId,Caption,OccurredAt) VALUES(@id,@pet,@caption,@date); INSERT dbo.MomentMedia(Id,MomentId,StorageKey,MimeType,SizeBytes,Format) VALUES(@media,@id,@key,@mime,@bytes,@format); END`,{id:mid,pet,caption:`[Mẫu] ${name}: ${['Ngày nắng thật đẹp','Một buổi chiều bình yên','Ánh mắt làm tan chảy trái tim','Chào tháng mới cùng bé','Khoảnh khắc đáng yêu hôm nay','Thêm một ngày bên nhau'][j]}`,date,media:id(`media${i}-${j}`),key:assets[i].public_id,mime:'image/'+assets[i].format,bytes:assets[i].bytes,format:assets[i].format});
 }
 const care=[['weight','2026-10-01',i?2.8:7.2,'Cân đầu tháng'],['weight','2026-10-15',i?3:7.8,'Theo dõi tăng trưởng'],['weight','2026-11-01',i?3.1:8.2,'Cân đầu tháng mới'],['weight','2026-11-03',i?3.2:8.4,'Cập nhật cân nặng'],['bath','2026-11-01',null,'Tắm và chải lông'],['nails','2026-11-02',null,'Vệ sinh móng'],['vet','2026-10-20',null,'Lịch khám minh họa, không phải hồ sơ y tế thực'],['note','2026-11-03',null,'Bé ăn ngon và chơi vui']];
 for(const [j,c]of care.entries())await q(`IF NOT EXISTS(SELECT 1 FROM dbo.CareRecords WHERE Id=@id) INSERT dbo.CareRecords(Id,PetId,Type,OccurredAt,ValueDecimal,Unit,Note) VALUES(@id,@pet,@type,@date,@value,@unit,@note)`,{id:id(`care${i}-${j}`),pet,type:c[0],date:c[1],value:c[2],unit:c[0]==='weight'?'kg':null,note:'[Mẫu] '+c[3]});
 for(const [j,date]of ['2026-08-01','2026-09-01','2026-11-01'].entries())await q(`IF NOT EXISTS(SELECT 1 FROM dbo.Milestones WHERE Id=@id) INSERT dbo.Milestones(Id,PetId,Type,MilestoneDate,Title) VALUES(@id,@pet,'custom',@date,@title)`,{id:id(`milestone${i}-${j}`),pet,date,title:'[Mẫu] '+['Ngày đầu về nhà','Một tháng bên nhau','Ba tháng đầy yêu thương'][j]});
 }
 for(let i=0;i<2;i++)await q(`IF NOT EXISTS(SELECT 1 FROM dbo.CartItems WHERE UserId=@user AND ProductId=@product) INSERT dbo.CartItems(UserId,ProductId,Quantity) VALUES(@user,@product,1)`,{product:products[i].Id});
 for(let i=0;i<3;i++)await q(`IF NOT EXISTS(SELECT 1 FROM dbo.Orders WHERE Id=@id) BEGIN INSERT dbo.Orders(Id,UserId,RequestKey,Recipient,Phone,Address,Total,Status,CreatedAt) VALUES(@id,@user,@id,N'[MẪU] Minh Tâm','0000000000',N'Địa chỉ minh họa — không giao hàng',@price,@status,@date); INSERT dbo.OrderItems(OrderId,ProductId,ProductName,UnitPrice,Quantity) VALUES(@id,@product,@name,@price,1); END`,{id:id('order'+i),price:products[i%2].Price,status:['delivered','cancelled','pending'][i],date:['2026-10-10','2026-10-20','2026-11-03'][i],product:products[i%2].Id,name:'[MẪU] '+products[i%2].Name});
 await tx.commit();
 }catch(e){await tx.rollback();throw e;}
 const jwt=require('jsonwebtoken');const env=require('../src/config/env');const token=jwt.sign({sub:user.Id},env.jwtSecret,{expiresIn:'5m'});
 for(const path of ['/pets','/profile','/shop/cart','/shop/orders',...Array.from({length:2},(_,i)=>['/pets/'+id('pet'+i)+'/moments','/pets/'+id('pet'+i)+'/care-records','/pets/'+id('pet'+i)+'/timeline','/pets/'+id('pet'+i)+'/recaps?year=2026&month=11']).flat()]){
 const r=await fetch('http://localhost:3000/api'+path,{headers:{Authorization:'Bearer '+token}});const body=await r.json();if(!r.ok)throw Error(path+': '+JSON.stringify(body));console.log(path+' OK '+(body.items?'items='+body.items.length:''));
 }
 console.log('Seed complete: 2 pets, 12 moments/photos, 16 care records, 6 milestones, 2 cart items, 3 demo orders.');
 }finally{await pool.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const errors = [], calls = [], contexts = [];
const room = { room_id:11, studio_id:7, name:'Phòng kiểm thử API', description:'Phòng vật lý từ API', area:60, capacity:8, rules:'Giữ vệ sinh.', thumbnail_url:null, images:[], studio:{ name:'Studio API', address:'12 Nguyễn Huệ', district:'Quận 1', city:'TP.HCM' }, display_rate:{ unit_price:300000, rate_unit:'hour' }, rates:[{ rate_id:5, rate_unit:'hour', unit_minutes:60, unit_price:300000, minimum_units:1, maximum_units:5 }] };
const users = { customer:{user_id:4,full_name:'Khách API',email:'customer@studio.local',phone:'0901234567',role:'customer'}, host:{user_id:2,full_name:'Chủ API',email:'host1@studio.local',phone:'0901234568',role:'host'}, admin:{user_id:1,full_name:'Quản trị API',email:'admin@studio.local',phone:'0901234569',role:'admin'} };
const studios=[{studio_id:7,name:'Studio API',address:'12 Nguyễn Huệ',district:'Quận 1',city:'TP.HCM',phone:'0901234567',status:'active'}];
const categories=[{category_id:9,name:'Đèn'}], equipment=[];
let booking = { booking_id:41,booking_code:'BK-API-0041',room_name:room.name,studio_name:room.studio.name,status:'pending',start_time:'2026-12-01 09:00:00',end_time:'2026-12-01 11:00:00',expires_at:'2026-12-01 08:00:00',total_amount:600000,deposit_amount:180000,room_amount:600000,equipment_amount:0,payments:[] };
async function context(role) {
  const c = await browser.newContext({ viewport:{width:1280,height:900} }); contexts.push(c);
  if (role) await c.addInitScript(r => sessionStorage.setItem('studiohub.api-token',r+'-token'),role);
  await c.route('http://127.0.0.1:8000/**', async route => {
    const req=route.request(), path=new URL(req.url()).pathname, method=req.method();
    const body=req.postData(), data=body ? JSON.parse(body) : null;
    const who=Object.keys(users).find(r=>req.headers().authorization==='Bearer '+r+'-token');
    calls.push({path,method,data,who}); let value;
    if(method==='OPTIONS') return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
    if(path==='/api/auth/login') { assert.equal(data.email,'customer@studio.local'); value={token:'customer-token',user:users.customer}; }
    else if(path==='/api/auth/register') { users.customer={...users.customer,full_name:data.full_name,email:data.email,phone:data.phone};value={token:'customer-token',user:users.customer}; }
    else if(path==='/api/auth/profile') { if(method==='PATCH') users[who]={...users[who],...data};value=users[who]; }
    else if(path==='/api/auth/logout') value=null;
    else if(path==='/api/space-types') value=[{space_type_id:1,name:'Nhiếp ảnh'}];
    else if(path==='/api/rooms') value={items:[room],pagination:{page:1,limit:12,total_items:1,total_pages:1}};
    else if(path==='/api/rooms/11') value=room;
    else if(path==='/api/rooms/11/calendar') value={busy_slots:[]};
    else if(path==='/api/studios/mine') value=studios;
    else if(path==='/api/studios'&&method==='POST') { assert.equal(who,'host');value={...data,studio_id:8,status:'active'};studios.push(value); }
    else if(path==='/api/equipment-categories') { assert.equal(who,'host');if(method==='POST') { value={...data,category_id:10};categories.push(value); } else value=categories; }
    else if(path==='/api/equipments') { if(method==='POST') {assert.equal(who,'host');value={...data,equipment_id:21,status:'active'};equipment.push(value);} else value=equipment; }
    else if(path==='/api/rooms/11/rates') { if(method==='POST') {assert.equal(who,'host');value={...data,rate_id:6,unit_minutes:60,maximum_units:5};room.rates.push(value);} else value=room.rates; }
    else if(path==='/api/bookings/check-availability') { assert.equal(data.room_id,11); assert.equal(data.rate_id,5); value={available:true,start_time:data.start_time,end_time:data.end_time,busy_end:data.end_time,pricing:{total_amount:600000,deposit_amount:180000,room_amount:600000,equipment_amount:0}}; }
    else if(path==='/api/bookings'&&method==='POST') { assert.equal(who,'customer'); assert.equal(data.room_id,11); booking={...booking,start_time:data.start_time,end_time:data.end_time};value=booking; }
    else if(path==='/api/bookings') { assert.ok(who);value={items:[booking],page:1,total_pages:1,total_items:1}; }
    else if(path==='/api/bookings/41') value=booking;
    else if(path==='/api/bookings/41/payments') { assert.equal(who,'customer');assert.equal(data.payment_type,'deposit');booking={...booking,payments:[{payment_id:1,payment_type:'deposit',amount:180000,status:'success'}]};value={payment_id:1}; }
    else if(path==='/api/bookings/41/status') { assert.equal(who,'host');booking={...booking,status:data.status};value=booking; }
    else if(path==='/api/bookings/41/cancel') { assert.equal(who,'customer');booking={...booking,status:'cancelled'};value=booking; }
    else if(path==='/api/admin/users') { assert.equal(who,'admin');value={items:Object.values(users).map(u=>({...u,status:'active'})),total_pages:1}; }
    else if(path.endsWith('/statistics')) value={period:{from:'2026-11-01',to:'2026-12-01'},total_bookings:1,total_revenue:0,occupancy_rate:1,total_studios:1,total_rooms:1};
    else throw new Error('Unhandled API request '+method+' '+path);
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({status:'success',data:value})});
  });
  return c;
}
try {
  const c=await context(), p=await c.newPage(); p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:3000/'); await p.getByRole('heading',{name:room.name}).waitFor(); assert.ok(await p.locator('.hero').isVisible()); console.log('PASS homepage hero + API rooms');
  await p.goto('http://127.0.0.1:3000/login'); await p.getByLabel('Email',{exact:true}).fill('customer@studio.local'); await p.getByLabel('Mật khẩu',{exact:true}).fill('password123'); await p.getByRole('button',{name:'Đăng nhập',exact:true}).click(); await p.waitForURL('**/my-bookings'); await p.getByRole('link',{name:'BK-API-0041'}).waitFor(); console.log('PASS login -> booking list');
  await p.goto('http://127.0.0.1:3000/rooms/11/book'); await p.getByLabel('Ngày thuê (giờ Việt Nam)').fill('2026-12-01'); await p.getByLabel('Số đơn vị thuê').fill('2'); assert.ok(await p.getByRole('button',{name:'Tạo đơn thuê',exact:true}).isDisabled());
  await p.getByRole('button',{name:'Kiểm tra lịch trống & giá'}).click(); await p.getByRole('heading',{name:'Chi phí từ máy chủ'}).waitFor(); await p.getByLabel('Giờ bắt đầu').fill('10:00'); assert.ok(await p.getByRole('button',{name:'Tạo đơn thuê',exact:true}).isDisabled()); await p.getByRole('button',{name:'Kiểm tra lịch trống & giá'}).click(); await p.getByRole('heading',{name:'Chi phí từ máy chủ'}).waitFor(); console.log('PASS changing interval invalidates quote');
  await p.getByText('Tôi đã kiểm tra thời gian, giá và nội quy Studio.').click(); await p.getByRole('button',{name:'Tạo đơn thuê',exact:true}).click(); await p.waitForURL('**/payment/41'); await p.getByRole('button',{name:'Mô phỏng trả cọc'}).waitFor(); assert.ok(await p.getByRole('button',{name:'Mô phỏng trả cọc'}).isDisabled()); await p.getByText('Tôi hiểu đây là thanh toán sandbox.').click(); await p.getByRole('button',{name:'Mô phỏng trả cọc'}).click(); await p.getByText('deposit:',{exact:false}).waitFor(); assert.equal(booking.status,'pending'); console.log('PASS create with API IDs + sandbox deposit stays pending');
  const hc=await context('host'), hp=await hc.newPage(); await hp.goto('http://127.0.0.1:3000/host/bookings/41'); await hp.getByRole('button',{name:'Đã xác nhận',exact:true}).click(); await hp.getByText('Đã xác nhận',{exact:true}).waitFor(); await p.reload(); await p.getByText('Đã xác nhận',{exact:true}).waitFor(); console.log('PASS host confirms -> customer sees persisted response');
  const gc=await context(), gp=await gc.newPage(); await gp.goto('http://127.0.0.1:3000/admin/users'); await gp.getByRole('heading',{name:'Khu vực quản lý'}).waitFor(); console.log('PASS guest admin route gate');
  const ac=await context('admin'), ap=await ac.newPage(); await ap.goto('http://127.0.0.1:3000/admin/users'); await ap.getByRole('cell',{name:'customer@studio.local',exact:true}).waitFor(); await ap.goto('http://127.0.0.1:3000/admin/host-requests'); await ap.getByRole('heading',{name:'Chức năng chưa được API hỗ trợ'}).waitFor(); console.log('PASS admin list + unsupported page boundary');
  await hp.goto('http://127.0.0.1:3000/host/studios'); await hp.getByLabel('Tên Studio',{exact:true}).fill('Studio mới API'); await hp.getByLabel('Địa chỉ',{exact:true}).fill('99 Nguyễn Huệ'); await hp.getByLabel('Quận / huyện').fill('Quận 1'); await hp.getByLabel('Tỉnh / thành phố').fill('TP.HCM'); await hp.getByLabel('Điện thoại',{exact:true}).fill('0901234567'); await hp.getByRole('button',{name:'Lưu',exact:true}).click(); await hp.getByRole('heading',{name:'Studio mới API',exact:true}).waitFor(); assert.equal(studios.length,2); console.log('PASS host creates studio and refetches');
  await hp.goto('http://127.0.0.1:3000/host/rates'); await hp.getByLabel('Chọn Studio',{exact:true}).selectOption('7'); await hp.getByRole('button',{name:room.name,exact:true}).click(); await hp.getByLabel('Đơn vị',{exact:true}).selectOption('hour'); await hp.getByLabel('Giá (VND)',{exact:true}).fill('350000'); await hp.getByRole('button',{name:'Lưu',exact:true}).click(); await hp.getByText('350.000').waitFor(); assert.equal(room.rates.length,2); console.log('PASS host creates configured rate and refetches');
  await hp.goto('http://127.0.0.1:3000/host/equipments'); await hp.getByLabel('Chọn Studio',{exact:true}).selectOption('7'); await hp.getByLabel('Nhóm',{exact:true}).selectOption('9'); await hp.getByLabel('Tên thiết bị',{exact:true}).fill('Đèn API'); await hp.getByLabel('Giá (VND)',{exact:true}).fill('50000'); await hp.getByLabel('Đơn vị',{exact:true}).selectOption('hour'); await hp.getByLabel('Tổng số lượng',{exact:true}).fill('2'); await hp.locator('form').filter({has:hp.getByLabel('Tên thiết bị',{exact:true})}).getByRole('button',{name:'Lưu',exact:true}).click(); await hp.getByRole('heading',{name:'Đèn API',exact:true}).waitFor(); assert.equal(equipment.length,1); console.log('PASS host creates equipment and refetches');
  await p.setViewportSize({width:390,height:844}); await p.goto('http://127.0.0.1:3000/rooms'); await p.getByRole('heading',{name:room.name}).waitFor(); assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); await p.screenshot({path:'.next/integration-mobile.png',fullPage:true}); console.log('PASS mobile catalog');
  await p.route('http://127.0.0.1:8000/api/rooms**',r=>r.abort()); await p.reload(); await p.getByRole('alert').waitFor(); assert.equal(await p.getByRole('heading',{name:room.name}).count(),0); console.log('PASS API outage has no mock fallback');
  await p.goto('http://127.0.0.1:3000/profile'); await p.getByLabel('Họ tên',{exact:true}).fill('Khách đã sửa hồ sơ'); await p.getByRole('button',{name:'Lưu hồ sơ'}).click(); await p.getByText('Đã lưu hồ sơ trên máy chủ.').waitFor(); assert.equal(users.customer.full_name,'Khách đã sửa hồ sơ'); await p.reload(); assert.equal(await p.getByLabel('Họ tên',{exact:true}).inputValue(),'Khách đã sửa hồ sơ'); console.log('PASS profile PATCH and refresh');
  await p.setViewportSize({width:1280,height:900}); await p.goto('http://127.0.0.1:3000/my-bookings/41'); p.once('dialog',d=>d.accept()); await p.getByRole('button',{name:'Hủy đơn',exact:true}).click(); await p.getByText('Đã hủy',{exact:true}).waitFor(); assert.equal(booking.status,'cancelled'); console.log('PASS customer cancellation + refetch');
  await p.getByRole('button',{name:'Đăng xuất',exact:true}).click(); await p.waitForURL('http://127.0.0.1:3000/'); assert.equal(await p.evaluate(()=>sessionStorage.getItem('studiohub.api-token')),null); console.log('PASS logout removes API token');
  await p.goto('http://127.0.0.1:3000/register'); await p.getByLabel('Họ tên',{exact:true}).fill('Khách mới API'); await p.getByLabel('Email',{exact:true}).fill('new@studio.local'); await p.getByLabel('Mật khẩu',{exact:true}).fill('password123'); await p.getByLabel('Số điện thoại',{exact:true}).fill('0901234567'); await p.getByRole('button',{name:'Tạo tài khoản',exact:true}).click(); await p.waitForURL('**/my-bookings'); assert.equal(users.customer.email,'new@studio.local'); console.log('PASS customer registration contract');
  assert.deepEqual(errors,[]); console.log('PASS no uncaught page errors; HTTP requests:',calls.length);
} finally { await Promise.all(contexts.map(c=>c.close())); await browser.close(); }

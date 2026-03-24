// unibridge-surface-telegram/public/app.js

const tg = window.Telegram?.WebApp;

/* ================= SAFE ALERT ================= */

function showError(msg){
if(tg){ tg.showAlert(msg); }
else{ alert(msg); }
}

/* ================= API ================= */

async function api(endpoint,payload){

const r =
await fetch(`/api/proxy?endpoint=${encodeURIComponent(endpoint)}`,{
method:"POST",
headers:{
"content-type":"application/json"
},
body:JSON.stringify(payload)
});

const text = await r.text();

let data;

try{
data = JSON.parse(text);
}catch{
data = { raw:text };
}

if(!r.ok){
throw new Error(data?.error || "api_error");
}

return data;

}

/* ================= READ FORM ================= */

function readForm(){

const receiver_country =
document.getElementById("receiver_country").value;

const amount =
Number(document.getElementById("amount").value);

if(!receiver_country)
throw new Error("missing_receiver_country");

if(!amount || amount<=0)
throw new Error("invalid_amount");

return {
receiver_country,
amount
};

}

/* ================= FLOW ================= */

async function start(){

const btn = document.getElementById("sendBtn");

try{

btn.disabled = true;

const form = readForm();

/* REGISTER */
const register =
await api("session/register",{
source_country:"US",
receiver_country:form.receiver_country
});

const session_id = register.session_id;

/* RESOLVE */
await api("session/resolve",{ session_id });

/* QUOTE */
const quote =
await api("session/quote",{
session_id,
amount:form.amount
});

if(!quote.routes || !quote.routes.length){
throw new Error("no_routes_available");
}

const route_id = quote.routes[0].route_id;

/* CREATE */
const create =
await api("settlement/create",{
session_id,
route_id,
destination:{
pix:"51999999999",
tax_id:"12345678909"
}
});

const settlement_id = create.settlement_id;

/* FUNDING */
const funding =
await api("funding/session",{ settlement_id });

const widget_url = funding.widget_url;

if(!widget_url){
throw new Error("widget_url_missing");
}

/* OPEN */
if(tg && tg.openLink){
tg.openLink(widget_url);
}else{
window.location.href = widget_url;
}

}
catch(err){

console.error(err);
showError(err.message || "transfer_failed");

}
finally{

if(btn){
btn.disabled = false;
}

}

}

/* ================= EXPOSE ================= */

window.start = start;

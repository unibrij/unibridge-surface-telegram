// unibridge-surface-telegram/public/app.js

/*
==================================================
UniBridge Telegram Surface
==================================================
Flow

1 register
2 resolve
3 quote
4 create settlement
5 funding session
6 open ramp widget
==================================================
*/

const tg = window.Telegram?.WebApp;

/*
==================================================
SAFE ALERT
==================================================
*/

function showError(msg){

if(tg){
tg.showAlert(msg);
}
else{
alert(msg);
}

}

/*
==================================================
API CALL
==================================================
*/

async function api(endpoint,payload){

const r =
await fetch(`/api/${endpoint}`,{
method:"POST",
headers:{
"content-type":"application/json"
},
body:JSON.stringify(payload)
});

const text =
await r.text();

let data;

try{
data = JSON.parse(text);
}
catch{
data = { raw:text };
}

if(!r.ok){
throw new Error(data?.error || "api_error");
}

return data;

}

/*
==================================================
READ FORM
==================================================
*/

function readForm(){

const sender_id =
document.getElementById("sender_id").value.trim();

const receiver_country =
document.getElementById("receiver_country").value;

const amount =
Number(document.getElementById("amount").value);

if(!sender_id)
throw new Error("missing_sender_id");

if(!receiver_country)
throw new Error("missing_receiver_country");

if(!amount || amount<=0)
throw new Error("invalid_amount");

return {
sender_id,
receiver_country,
amount
};

}

/*
==================================================
MAIN FLOW
==================================================
*/

async function start(){

const btn =
document.querySelector("button");

try{

btn.disabled = true;

const form =
readForm();

/*
--------------------------------
1 REGISTER
--------------------------------
*/

const register =
await api(
"session/register",
{
partner_id:"surface",
sender_id:form.sender_id,
sender_country:"USA",
receiver_country:form.receiver_country,
amount:form.amount
}
);

const session_id =
register.session_id;

/*
--------------------------------
2 RESOLVE
--------------------------------
*/

await api(
"session/resolve",
{
partner_id:"surface",
session_id
}
);

/*
--------------------------------
3 QUOTE
--------------------------------
*/

const quote =
await api(
"session/quote",
{
partner_id:"surface",
session_id
}
);

if(!quote.routes || !quote.routes.length){
throw new Error("no_routes_available");
}

const route_id =
quote.routes[0].route_id;

/*
--------------------------------
4 CREATE SETTLEMENT
--------------------------------
*/

const create =
await api(
"settlement/create",
{
session_id,
route_id,
destination:{
pix:"51999999999",
tax_id:"12345678909"
}
}
);

const settlement_id =
create.settlement_id;

/*
--------------------------------
5 FUNDING SESSION
--------------------------------
*/

const funding =
await api(
"funding/session",
{
settlement_id
}
);

const widget_url =
funding.widget_url;

if(!widget_url){
throw new Error("widget_url_missing");
}

/*
--------------------------------
OPEN RAMP
--------------------------------
*/

window.location.href =
widget_url;

}
catch(err){

console.error(err);

showError(err.message || "transfer_failed");

btn.disabled = false;

}

}

/*
==================================================
EXPOSE FUNCTION
==================================================
*/

window.start = start;

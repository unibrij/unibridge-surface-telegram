// unibridge-surface-telegram/public/app.js

const tg = window.Telegram?.WebApp;

/*
==================================================
SAFE ALERT
==================================================
*/

function showError(msg){
  if(tg){
    tg.showAlert(msg);
  } else {
    alert(msg);
  }
}

/*
==================================================
API MODE (FINAL SAFE LOGIC)
==================================================
*/

const host = window.location.hostname;
const path = window.location.pathname;

const isMainDomain =
  host === "unibrij.io" || host === "www.unibrij.io";

const isSurface =
  path === "/surface" || path.startsWith("/surface/");

const isTelegram = !!tg;

/*
🔥 المهم:
- main domain + surface → proxy
- main domain + telegram → proxy
- غير ذلك → direct
*/

const API_BASE =
  (isMainDomain && (isSurface || isTelegram))
    ? "/api"
    : "https://unibridge-v2-xxx.run.app"; // ← حط الرابط الحقيقي

/*
==================================================
API CALL
==================================================
*/

async function api(endpoint, payload){

  /*
  --------------------------------
  CONTEXT GUARD
  --------------------------------
  */

  if(!isSurface && !isTelegram){
    throw new Error("This action is not available here");
  }

  const isProxy = API_BASE === "/api";

  const method =
    endpoint === "settlement/status" ? "GET" : "POST";

  let url;

  if(isProxy){
    url = `/api?endpoint=${encodeURIComponent(endpoint)}`;
  } else {
    url = `${API_BASE}/v2/${endpoint}`;
  }

  /*
  --------------------------------
  CLEAN + ATTACH QUERY PARAMS
  --------------------------------
  */

  if(method === "GET" && payload){
    const cleanPayload = Object.fromEntries(
      Object.entries(payload || {}).filter(([_,v]) => v != null)
    );

    const params = new URLSearchParams(cleanPayload).toString();

    if(params){
      url += isProxy
        ? `&${params}`
        : `?${params}`;
    }
  }

  const options = {
    method,
    headers:{
      "content-type":"application/json"
    }
  };

  if(method === "POST"){
    options.body = JSON.stringify(payload || {});
  }

  /*
  --------------------------------
  FETCH WITH TIMEOUT
  --------------------------------
  */

  let r;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try{
    r = await fetch(url,{
      ...options,
      signal: controller.signal
    });
  }
  catch(err){
    throw new Error("Network issue — please try again");
  }
  finally{
    clearTimeout(timeout);
  }

  const text = await r.text();

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

  const receiver_country =
    document.getElementById("receiver_country").value;

  const amount =
    Number(document.getElementById("amount").value);

  if(!receiver_country)
    throw new Error("missing_receiver_country");

  if(!amount || amount <= 0)
    throw new Error("invalid_amount");

  return {
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

  const btn = document.getElementById("sendBtn");

  try{

    btn.disabled = true;

    const form = readForm();

    // 1 REGISTER
    const register = await api("session/register",{
      source_country:"US",
      receiver_country:form.receiver_country
    });

    const session_id = register.session_id;

    // 2 RESOLVE
    await api("session/resolve",{ session_id });

    // 3 QUOTE
    const quote = await api("session/quote",{
      session_id,
      amount:form.amount
    });

    if(!quote.routes || !quote.routes.length){
      throw new Error("no_routes_available");
    }

    const route_id = quote.routes[0].route_id;

    // 4 CREATE SETTLEMENT
    const create = await api("settlement/create",{
      session_id,
      route_id,
      destination:{
        pix:"51999999999",
        tax_id:"12345678909"
      }
    });

    const settlement_id = create.settlement_id;

    // 5 FUNDING SESSION
    const funding = await api("funding/session",{ settlement_id });

    const widget_url = funding.widget_url;

    if(!widget_url){
      throw new Error("widget_url_missing");
    }

    // OPEN RAMP
    if(tg && tg.openLink){
      tg.openLink(widget_url);
    } else {
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

/*
==================================================
EXPOSE
==================================================
*/

window.start = start;

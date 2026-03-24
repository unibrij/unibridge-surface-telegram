import express from "express";
import crypto from "crypto";

const app = express();

app.use(express.json());
app.use(express.static("public"));

const API_BASE = process.env.UNIBRIDGE_API_BASE;

if (!API_BASE) {
throw new Error("UNIBRIDGE_API_BASE missing");
}

const PARTNER_ID = "surface";

const SECRET = process.env.SURFACE_HMAC_SECRET;

if (!SECRET) {
throw new Error("SURFACE_HMAC_SECRET missing");
}

const ALLOWED = new Set([
"session/register",
"session/resolve",
"session/quote",
"settlement/create",
"settlement/confirm",
"funding/session"
]);

function sign(payload){
return crypto
.createHmac("sha256", SECRET)
.update(payload)
.digest("hex");
}

/* ================= FIXED ROUTE ================= */

app.post("/api/proxy", async (req,res)=>{

try{

const endpoint = String(req.query.endpoint || "")
  .trim()
  .replace(/^\/+/, "")
  .replace(/\/+$/, "");

if(!endpoint || !ALLOWED.has(endpoint)){
  return res.status(403).json({
    error:"endpoint_not_allowed"
  });
}

if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
  return res.status(400).json({
    error:"invalid_payload"
  });
}

const payload = JSON.stringify(req.body);

const signature = sign(payload);

const controller = new AbortController();

const timeout = setTimeout(
  () => controller.abort(),
  15000
);

let upstream;

try{

  upstream = await fetch(
    `${API_BASE}/${endpoint}`,
    {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-ub-partner-id":PARTNER_ID,
        "x-ub-signature":signature
      },
      body:payload,
      signal:controller.signal
    }
  );

}
finally{
  clearTimeout(timeout);
}

const text = await upstream.text();

let data;

try{
  data = JSON.parse(text);
}
catch{
  data = { raw:text };
}

res.status(upstream.status).json(data);

}
catch(err){

console.error("SURFACE_PROXY_ERROR",err);

if (err.name === "AbortError") {
  return res.status(504).json({
    error:"upstream_timeout"
  });
}

res.status(500).json({
  error:"surface_proxy_error",
  message:err.message
});

}

});

/* ================= STATUS ================= */

app.get("/api/proxy", async (req,res)=>{

try{

if(req.query.endpoint !== "settlement/status"){
  return res.status(403).json({
    error:"endpoint_not_allowed"
  });
}

if(!req.query.settlement_id){
  return res.status(400).json({
    error:"missing_settlement_id"
  });
}

const query =
  new URLSearchParams({
    settlement_id: req.query.settlement_id
  }).toString();

const upstream =
  await fetch(
    `${API_BASE}/settlement/status?${query}`,
    {
      method:"GET",
      headers:{
        "x-ub-partner-id":PARTNER_ID
      }
    }
  );

const text = await upstream.text();

let data;

try{
  data = JSON.parse(text);
}
catch{
  data = { raw:text };
}

res.status(upstream.status).json(data);

}
catch(err){

console.error("SURFACE_STATUS_PROXY_ERROR",err);

res.status(500).json({
  error:"status_proxy_error"
});

}

});

/* ================= HEALTH ================= */

app.get("/health",(req,res)=>{
res.json({
status:"ok",
service:"unibridge-surface"
});
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
console.log(`unibridge surface running on port ${PORT}`);
});

import crypto from "crypto";

const API_BASE = process.env.UNIBRIDGE_API_BASE;
const SECRET = process.env.SURFACE_HMAC_SECRET;

const ALLOWED = new Set([
"session/register",
"session/resolve",
"session/quote",
"settlement/create",
"settlement/confirm",
"funding/session",
"settlement/status"
]);

export default async function handler(req,res){

try{

if(!API_BASE || !SECRET){
return res.status(500).json({
error:"server_misconfigured"
});
}

/*
------------------------------
endpoint normalization
------------------------------
*/

const endpoint =
(req.query.endpoint || "")
.replace(/^\/+/,"")
.replace(/\/+$/,"");

if(!endpoint){
return res.status(400).json({
error:"missing_endpoint"
});
}

if(!ALLOWED.has(endpoint)){
return res.status(403).json({
error:"endpoint_not_allowed"
});
}

/*
------------------------------
STATUS ENDPOINT (GET)
------------------------------
*/

if(endpoint === "settlement/status"){

if(req.method !== "GET"){
return res.status(405).json({
error:"method_not_allowed"
});
}

const params = new URLSearchParams();

if(req.query.settlement_id){
params.set("settlement_id", req.query.settlement_id);
}

const query = params.toString();

const upstream =
await fetch(
`${API_BASE}/settlement/status?${query}`,
{
method:"GET",
headers:{
"x-ub-partner-id":"surface"
}
}
);

const text = await upstream.text();

let data;

try{
data = JSON.parse(text);
}catch{
data = {raw:text};
}

return res
.status(upstream.status)
.json(data);

}

/*
------------------------------
POST ENDPOINTS
------------------------------
*/

if(req.method !== "POST"){
return res.status(405).json({
error:"method_not_allowed"
});
}

const payload =
JSON.stringify(req.body || {});

/*
payload protection
*/

if(payload.length > 10000){
return res.status(413).json({
error:"payload_too_large"
});
}

const signature =
crypto
.createHmac("sha256",SECRET)
.update(payload)
.digest("hex");

const controller = new AbortController();

const timeout =
setTimeout(
()=>controller.abort(),
15000
);

let upstream;

try{

upstream =
await fetch(
`${API_BASE}/${endpoint}`,
{
method:"POST",
headers:{
"content-type":"application/json",
"x-ub-partner-id":"surface",
"x-ub-signature":signature,
"x-forwarded-host":req.headers.host || "",
"x-forwarded-for":req.headers["x-forwarded-for"] || ""
},
body:payload,
signal:controller.signal
}
);

}
finally{
clearTimeout(timeout);
}

const text =
await upstream.text();

let data;

try{
data = JSON.parse(text);
}catch{
data = {raw:text};
}

return res
.status(upstream.status)
.json(data);

}
catch(err){

console.error("PROXY_ERROR",err);

if(err.name === "AbortError"){
return res.status(504).json({
error:"upstream_timeout"
});
}

return res.status(500).json({
error:"surface_proxy_error"
});

}

}

// unibridge-surface-telegram/server/server.js

import express from "express";
import crypto from "crypto";

/*
-----------------------------------------
APP INIT
-----------------------------------------
*/

const app = express();

app.use(express.json());
app.use(express.static("public"));

/*
-----------------------------------------
CONFIG
-----------------------------------------
*/

const API_BASE =
"https://unibridge-v2-vqia6yp7wq-uc.a.run.app/v2";

const PARTNER_ID =
"surface";

const SECRET =
process.env.SURFACE_HMAC_SECRET;

if (!SECRET) {
throw new Error("SURFACE_HMAC_SECRET missing");
}

/*
-----------------------------------------
ALLOWED ENDPOINTS
-----------------------------------------
*/

const ALLOWED = new Set([
"session/register",
"session/resolve",
"session/quote",
"settlement/create",
"settlement/confirm",
"funding/session"
]);

/*
-----------------------------------------
SIGN PAYLOAD
-----------------------------------------
*/

function sign(payload){

return crypto
.createHmac("sha256", SECRET)
.update(payload)
.digest("hex");

}

/*
-----------------------------------------
UNIBRIDGE PROXY
-----------------------------------------
*/

app.post("/api/*", async (req,res)=>{

try{

const endpoint =
req.path.replace(/^\/api\//,"");

if(!ALLOWED.has(endpoint)){

return res.status(403).json({
error:"endpoint_not_allowed"
});

}

if (typeof req.body !== "object") {

return res.status(400).json({
error:"invalid_payload"
});

}

const payload =
JSON.stringify(req.body);

const signature =
sign(payload);

/*
-----------------------------------------
TIMEOUT PROTECTION
-----------------------------------------
*/

const controller =
new AbortController();

const timeout =
setTimeout(
() => controller.abort(),
15000
);

const r =
await fetch(
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

clearTimeout(timeout);

const text =
await r.text();

let data;

try{

data = JSON.parse(text);

}
catch{

data = { raw:text };

}

res.status(r.status).json(data);

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

/*
-----------------------------------------
HEALTH CHECK
-----------------------------------------
*/

app.get("/health",(req,res)=>{

res.json({
status:"ok",
service:"unibridge-surface"
});

});

/*
-----------------------------------------
SERVER START
-----------------------------------------
*/

const PORT =
process.env.PORT || 3000;

app.listen(PORT,()=>{

console.log(
`unibridge surface running on port ${PORT}`
);

});

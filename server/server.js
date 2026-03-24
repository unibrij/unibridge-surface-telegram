app.post("/api", async (req,res)=>{

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
    `${API_BASE}/v2/${endpoint}`,
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

if(!upstream){
  throw new Error("upstream_failed");
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

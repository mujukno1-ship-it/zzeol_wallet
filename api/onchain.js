export default async function handler(req,res){
  try{
    res.status(200).json({ ok:true, source:'onchain:stub', ts:Date.now() });
  }catch(e){
    return json({ ok: false, error: "Not Found" }, 404, CORS);
}

    res.status(500).json({ ok:false, error:e?.message || 'onchain_error' });
  }
}

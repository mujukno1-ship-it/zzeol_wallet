export default async function handler(req,res){
  try{
    res.status(200).json({ ok:true, source:'onchain:stub', ts:Date.now() });
  }catch(e){
    res.status(500).json({ ok:false, error:e?.message || 'onchain_error' });
  }
}

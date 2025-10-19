export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const ok = (res, body) => {
  res.status(200).setHeader('Content-Type', 'application/json');
  Object.entries(cors).forEach(([k,v])=>res.setHeader(k,v));
  res.end(JSON.stringify(body));
};
export const fail = (res, status, msg) => {
  Object.entries(cors).forEach(([k,v])=>res.setHeader(k,v));
  res.status(status).json({ ok:false, error: msg });
};
export const handleOptions = (req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(cors).forEach(([k,v])=>res.setHeader(k,v));
    res.status(204).end();
    return true;
  }
  return false;
};

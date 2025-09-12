
async function api(path, opts={}){
  const res = await fetch(path, {headers:{'Content-Type':'application/json'}, ...opts});
  if(!res.ok){
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || ('HTTP '+res.status));
  }
  return res.json();
}

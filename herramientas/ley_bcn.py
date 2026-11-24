# Convierte el XML oficial de la BCN (leychile.cl/Consulta/obtxml?opt=7&idNorma=1007469) en ley.json para ley.html.
# Uso: guardar el XML como ley.xml y ejecutar python3 ley_bcn.py
import xml.etree.ElementTree as ET, re, json, sys
ns={'n':'http://www.leychile.cl/esquemas'}
r=ET.parse('ley.xml').getroot()
def T(e):
  x=e.find('n:Texto',ns); return (x.text or '') if x is not None else ''
def kids(e): return e.findall('n:EstructurasFuncionales/n:EstructuraFuncional',ns)
def clean(t):
  paras=[]; cur=''
  skip=False
  for ln in t.replace('\r','').split('\n'):
    if re.match(r'^\s{25,}\S', ln): continue          # nota al margen sola
    m=re.match(r'^(\s*)(.*?)(\s{6,}\S.*)?$', ln); ind, body = len(m.group(1)), m.group(2).rstrip()
    if not body: 
      if cur: paras.append(cur); cur=''
      continue
    if ind>=3 and cur: paras.append(cur); cur=''
    cur = (cur+' '+body).strip() if cur else body
  if cur: paras.append(cur)
  out=[]; 
  for p in paras:
    p=re.sub(r'LEY N[º°]\s?\d+\.\d+\s*','',p)
    p=re.sub(r'\s+',' ',p).strip()
    if not p: continue
    if re.match(r'^NOTA\b',p): skip=True
    if skip: 
      continue
    out.append(p)
  return out
data=[]
da=kids(kids(r)[0])[0]
def arts(e, acc):
  for k in kids(e):
    tp=k.get('tipoParte')
    if tp=='Artículo':
      ps=clean(T(k))
      if not ps: continue
      m=re.match(r'^Art[íi]culo\s+([\w°º ]+?)\s*[\.\-–]+\s*',ps[0])
      acc.append({'n': (m.group(1).strip() if m else ''), 'd': k.get('derogado')=='derogado', 'p': ps})
    elif tp=='Párrafo':
      ps=clean(T(k)); acc.append({'h': ' '.join(ps)[:160]}); arts(k, acc)
for t in kids(da):
  ps=clean(T(t)); title=' — '.join(p for p in ps if not re.match(r'^\(?arts?\.',p,re.I))
  rng=' '.join(p for p in ps if re.match(r'^\(?arts?\.',p,re.I))
  a=[]; arts(t,a)
  title=re.sub(r'\s*\(arts?\.[^)]*\)\s*','',title,flags=re.I).strip()
  parts=title.split(' — ')
  def sc(x): x=x.lower(); return x[:1].upper()+x[1:]
  head=re.sub(r'^T[ÍI]TULO','Título',parts[0]) if parts[0].upper().startswith(('TÍTULO','TITULO')) else sc(parts[0])
  title=' — '.join([head]+[sc(p) for p in parts[1:]])
  rng=re.sub(r'(?i)arts?\.','Arts.',rng).replace('(','').replace(')','').replace(' - ','-')
  data.append({'t': title, 'r': rng, 'a': a})
json.dump({'ver':'2026-10-22','tit':data}, open('ley.json','w',encoding='utf8'), ensure_ascii=False, separators=(',',':'))
print(sum(len(x['a']) for x in data), 'items', len(open('ley.json',encoding='utf8').read()))
for x in data: print(x['t'][:80],'|',x['r'],'|',len(x['a']))

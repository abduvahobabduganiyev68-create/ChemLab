import { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, TableProperties, Calculator, ArrowLeftRight, Orbit, FlaskConical,
  LibraryBig, CircleHelp, Search, Menu, Bell, ChevronRight, X, Beaker, Atom
} from 'lucide-react'
import './App.css'
import './ReactionBalancer.css'
import ReactionQuiz from './ReactionQuiz.jsx'
import { elements, categoryNames } from './data/elements'
import { calculateFormula } from './chemistry/formula'
import { balanceEquation } from './chemistry/balance'

const navItems=[
  ['/','Boshqaruv paneli',LayoutDashboard],['/periodic-table','Davriy jadval',TableProperties],
  ['/calculator','Kimyoviy kalkulyator',Calculator],['/reactions','Reaksiyalar',ArrowLeftRight],
  ['/molecules','Molekula tadqiqotchisi',Orbit],['/laboratory','Virtual laboratoriya',FlaskConical],
  ['/library','Kutubxona',LibraryBig],['/reaction-test','Testlar',CircleHelp],
]
function App(){
  const [menuOpen,setMenuOpen]=useState(false),[query,setQuery]=useState('')
  const navigate=useNavigate()
  const submit=e=>{e.preventDefault();navigate(`/search?q=${encodeURIComponent(query)}`)}
  return <div className="app-shell">
    <aside className={menuOpen?'sidebar open':'sidebar'}>
      <div className="brand"><div className="brand-mark">C</div><div><strong>ChemLab</strong><span>Ilmiy platforma</span></div></div>
      <nav>{navItems.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setMenuOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><div className="avatar">AB</div><div><strong>Ali Bek</strong><span>Talaba</span></div></div>
    </aside>
    {menuOpen&&<button className="backdrop" onClick={()=>setMenuOpen(false)} aria-label="Menyuni yopish"/>}
    <main className="main">
      <header className="topbar"><button className="icon-button menu-button" onClick={()=>setMenuOpen(true)} aria-label="Menyuni ochish"><Menu size={20}/></button>
        <form className="global-search" onSubmit={submit}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Element, formula yoki mavzu qidirish"/><kbd>Ctrl K</kbd></form>
        <button className="icon-button" aria-label="Bildirishnomalar"><Bell size={19}/></button>
      </header>
      <div className="content"><Routes>
        <Route path="/" element={<Dashboard/>}/><Route path="/periodic-table" element={<PeriodicTable/>}/>
        <Route path="/calculator" element={<FormulaCalculator/>}/><Route path="/reactions" element={<ReactionBalancer/>}/>
        <Route path="/reaction-test" element={<ReactionQuiz/>}/>
        <Route path="/molecules" element={<Molecules/>}/><Route path="/laboratory" element={<Laboratory/>}/>
        <Route path="/library" element={<Library/>}/><Route path="/quiz" element={<Navigate to="/reaction-test" replace/>}/>
        <Route path="/search" element={<SearchPage/>}/>
      </Routes></div>
    </main>
  </div>
}

function PageTitle({eyebrow,title,description,action}){
 return <div className="page-heading"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>
}
function Dashboard(){
 const navigate=useNavigate()
 return <>
  <PageTitle eyebrow="BUGUNGI TAHLIL" title="Xush kelibsiz, Ali" description="Kimyo darslaringiz va laboratoriya faoliyatingizni davom ettiring."/>
  <div className="dashboard-grid">
   <section className="hero-card"><div><span>O‘RGANISH YO‘NALISHI</span><h2>Organik kimyoni bir qadam oldinga oling</h2><p>Funksional guruhlar va izomerlar bo‘limlarini ko‘rib chiqing.</p><button className="primary" onClick={()=>navigate('/library')}>Davomini o‘qish <ChevronRight size={17}/></button></div><div className="atom-art"><div/><span/><span/><span/></div></section>
   <section className="fact-card"><span className="tag">Bugungi fakt</span><h3>Vodorod — eng ko‘p tarqalgan element</h3><p>Koinotdagi atomlarning taxminan 90% ini vodorod tashkil qiladi.</p></section>
  </div>
  <div className="section-title"><h2>Tezkor vositalar</h2></div>
  <div className="tool-grid">
   <button onClick={()=>navigate('/periodic-table')}><div className="tool-icon blue"><TableProperties/></div><div><strong>Davriy jadval</strong><span>118 elementni ko‘rish</span></div><ChevronRight size={18}/></button>
   <button onClick={()=>navigate('/calculator')}><div className="tool-icon cyan"><Calculator/></div><div><strong>Massa kalkulyatori</strong><span>Formula tahlili</span></div><ChevronRight size={18}/></button>
   <button onClick={()=>navigate('/reactions')}><div className="tool-icon violet"><ArrowLeftRight/></div><div><strong>Reaksiya tenglash</strong><span>Koeffitsiyentlarni hisoblash</span></div><ChevronRight size={18}/></button>
   <button onClick={()=>navigate('/reaction-test')}><div className="tool-icon amber"><CircleHelp/></div><div><strong>Bilimni sinash</strong><span>Interaktiv test</span></div><ChevronRight size={18}/></button>
  </div>
  <div className="dashboard-bottom"><section><div className="section-title"><h2>So‘nggi ko‘rilgan elementlar</h2></div><div className="recent-elements">{elements.slice(0,6).map(e=><button key={e.number} onClick={()=>navigate('/periodic-table')}><b>{e.symbol}</b><span>{e.uzName}</span><small>{e.number}</small></button>)}</div></section><section className="progress-card"><span>Haftalik maqsad</span><h3>4 / 5 dars</h3><div className="progress"><i/></div><p>Har kuni 20 daqiqa o‘qish bilan maqsadga yeting.</p></section></div>
 </>
}

function PeriodicTable(){
 const [category,setCategory]=useState('all'),[search,setSearch]=useState(''),[selected,setSelected]=useState(null)
 const visible=elements.filter(e=>(category==='all'||e.category===category)&&(`${e.name} ${e.uzName} ${e.symbol} ${e.number}`.toLowerCase().includes(search.toLowerCase())))
 return <>
  <PageTitle eyebrow="INTERAKTIV MA’LUMOTLAR" title="Davriy jadval" description="Elementlarning to‘liq xossalari va o‘zaro bog‘liqliklarini o‘rganing."/>
  <div className="filter-row"><div className="field-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Element yoki tartib raqami"/></div><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Barcha kategoriyalar</option>{Object.entries(categoryNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
  <div className="table-layout"><div className="periodic-grid">
   {visible.map(e=><button key={e.number} className={`element category-${e.category}`} style={{gridColumn:e.group,gridRow:e.period}} onClick={()=>setSelected(e)}><small>{e.number}</small><strong>{e.symbol}</strong><span>{e.uzName}</span><em>{e.mass}</em></button>)}
   {[{n:57,t:'57–71',r:6,c:3},{n:89,t:'89–103',r:7,c:3}].map(p=><div key={p.n} className="series-marker" style={{gridColumn:p.c,gridRow:p.r}}>{p.t}</div>)}
  </div></div>
  <div className="legend">{Object.entries(categoryNames).map(([key,label])=><span key={key}><i className={`dot category-${key}`}/>{label}</span>)}</div>
  {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><section className="element-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}><X size={20}/></button><div className={`element-detail category-${selected.category}`}><strong>{selected.symbol}</strong><span>{selected.number}</span></div><div><span className="eyebrow">{categoryNames[selected.category]}</span><h2>{selected.uzName}</h2><dl><div><dt>Atom massasi</dt><dd>{selected.mass}</dd></div><div><dt>Guruh</dt><dd>{selected.group}</dd></div><div><dt>Davr</dt><dd>{selected.period}</dd></div></dl></div></section></div>}
 </>
}

 function FormulaCalculator(){
  const [formula,setFormula]=useState('Ca(OH)2'),[result,setResult]=useState(null),[error,setError]=useState('')
  const calculate=()=>{try{setResult(calculateFormula(formula));setError('')}catch(e){setResult(null);setError(e.message)}}
  return <><PageTitle eyebrow="HISOBLASH" title="Kimyoviy formula kalkulyatori" description="Formulaning tarkibi, atomlar soni va molyar massasini aniqlang."/><div className="workspace-grid"><section className="panel"><label>Kimyoviy formula</label><div className="formula-input"><input value={formula} onChange={e=>setFormula(e.target.value)} onKeyDown={e=>e.key==='Enter'&&calculate()} placeholder="Masalan: Al2(SO4)3"/><button onClick={calculate} className="primary">Hisoblash</button></div>{error&&<div className="error-box">{error}</div>}<div className="examples">{['H2O','CO2','NaCl','H2SO4','Ca(OH)2','Al2(SO4)3'].map(x=><button key={x} onClick={()=>setFormula(x)}>{x}</button>)}</div></section>
  {result&&<section className="result-card"><span>Molyar massa</span><strong>{result.molarMass.toFixed(3)} <small>g/mol</small></strong><div className="composition">{Object.entries(result.composition).map(([symbol,count])=><div key={symbol}><b>{symbol}</b><span>{count} atom</span></div>)}</div></section>}</div></>
 }

 const reactionExamples=[
  'H2 + O2 -> H2O','Fe + HCl -> FeCl2 + H2','Al + HCl -> AlCl3 + H2',
  'Na + Cl2 -> NaCl','Mg + O2 -> MgO','KClO3 -> KCl + O2',
  'CaCO3 -> CaO + CO2','NH3 + O2 -> NO + H2O',
  'Ca(OH)2 + HCl -> CaCl2 + H2O',
  'Al2(SO4)3 + Ca(OH)2 -> Al(OH)3 + CaSO4',
 ]
 function ChemicalEquation({value}){
  return value.split(/(→|\+)/).map((part,index)=>{
   if(part==='→'||part==='+')return <span key={index} className="equation-operator">{part}</span>
   const match=part.trim().match(/^(\d+)?(.*)$/)
   return <span key={index} className="equation-compound">{match[1]&&match[1]!=='1'?match[1]:''}{match[2].split(/(\d+)/).map((token,subIndex)=>/\d+/.test(token)?<sub key={subIndex}>{token}</sub>:token)}</span>
  })
 }
 function ReactionBalancer(){
  const [equation,setEquation]=useState(''),[result,setResult]=useState(null),[error,setError]=useState('')
  const balance=(event)=>{event?.preventDefault();try{setResult(balanceEquation(equation));setError('')}catch(e){setResult(null);setError(e.message)}}
  const updateEquation=value=>{setEquation(value);setResult(null);setError('')}
  return <>
   <PageTitle eyebrow="TENGLASH" title="Kimyoviy reaksiya balansori" description="O‘zingizning tenglamangizni kiriting. Balanslash atomlar saqlanish qonuniga asoslanadi." action={<NavLink className="reaction-test-link" to="/reaction-test">Bilimni sinash <ChevronRight size={16}/></NavLink>}/>
   <section className="panel reaction-panel">
    <label htmlFor="reaction-equation">Reaksiya tenglamasi</label>
    <form onSubmit={balance}>
     <textarea id="reaction-equation" className="reaction-input" value={equation} onChange={event=>updateEquation(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();balance(event)}}} placeholder="Masalan: Ca(OH)2 + HCl -> CaCl2 + H2O" rows={3}/>
     <div className="reaction-actions"><button type="submit" className="primary">Tenglashtirish</button><button type="button" className="clear-reaction" onClick={()=>updateEquation('')} disabled={!equation}>Tozalash</button><span>Enter — tenglashtirish · qavslar va nested formulalar qo‘llab-quvvatlanadi</span></div>
    </form>
    {error&&<div className="error-box" role="alert">{error}</div>}
    <div className="reaction-examples"><strong>Namuna tenglamalar</strong><div className="examples">{reactionExamples.map(example=><button type="button" key={example} onClick={()=>updateEquation(example)}>{example.replace('->','→')}</button>)}</div></div>
   </section>
   {result&&<section className="reaction-result">
    <div className="reaction-result-heading"><span className="eyebrow">HISOBLASH NATIJASI</span><span className={`validation-badge ${result.validation?'valid':''}`}>{result.validation?'Atomlar teng':'Tekshiruvdan o‘tmadi'}</span></div>
    <div className="equation-result"><span>Asl tenglama</span><p><ChemicalEquation value={result.original.replace(/->|=/g,'→')}/></p></div>
    <div className="equation-result balanced"><span>{result.alreadyBalanced?'Tenglama avvaldan balanslangan':'Balanslangan tenglama'}</span><p><ChemicalEquation value={result.balanced}/></p></div>
    <h3>Atomlar tekshiruvi</h3><div className="atom-table-wrap"><table className="atom-table"><thead><tr><th>Element</th><th>Reagentlar</th><th>Mahsulotlar</th><th>Holat</th></tr></thead><tbody>{result.atomCounts.map(item=><tr key={item.element}><th>{item.element}</th><td>{item.reactants}</td><td>{item.products}</td><td>{item.balanced?'Teng':'Farq bor'}</td></tr>)}</tbody></table></div>
    <p className="chemistry-limitation">{result.note}</p>
   </section>}
  </>
 }

 const molecules=[
  {name:'Suv',formula:'H₂O',info:'Hayot uchun asosiy qutbli molekula.',bonds:'2 H–O bog‘'},
  {name:'Karbonat angidrid',formula:'CO₂',info:'Ildiz va atmosfera kimyosida muhim modda.',bonds:'2 C=O bog‘'},
  {name:'Metan',formula:'CH₄',info:'Eng sodda uglevodorod va tabiy yoqilg‘i komponenti.',bonds:'4 C–H bog‘'},
  {name:'Etil spirti',formula:'C₂H₅OH',info:'Suv bilan aralashuvchi organik erituvchi.',bonds:'Og‘iz guruhi –OH'},
 ]
 function Molecules(){
  const [search,setSearch]=useState(''),[selected,setSelected]=useState(molecules[0])
  const filtered=molecules.filter(m=>(m.name+' '+m.formula).toLowerCase().includes(search.toLowerCase()))
  return <><PageTitle eyebrow="MOLEKULALAR" title="Molekula tadqiqotchisi" description="Tanish oddiy molekulalarning formulasi va bog‘lanishlarini o‘rganing."/><div className="molecule-layout"><div className="molecule-list"><div className="field-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Molekula izlash"/></div>{filtered.map(m=><button key={m.formula} className={selected.formula===m.formula?'active':''} onClick={()=>setSelected(m)}><b>{m.formula}</b><span>{m.name}</span></button>)}</div><section className="molecule-view"><div className="molecule-visual"><i/><i/><i/><i/><i/></div><div><span className="eyebrow">Tanlangan molekula</span><h2>{selected.name}</h2><strong>{selected.formula}</strong><p>{selected.info}</p><div className="info-chip">{selected.bonds}</div></div></section></div></>
 }

 function Laboratory(){
  const [ph,setPh]=useState(7)
  const color=ph<5?'#ef4444':ph<7?'#f59e0b':ph===7?'#10b981':'#3b82f6'
  return <><PageTitle eyebrow="VIRTUAL LABORATORIYA" title="pH indikator modeli" description="Xavfsiz, virtual muhitda eritma kislotali-xossalarini kuzating."/><div className="lab-layout"><section className="lab-controls panel"><h3>Eritma parametri</h3><label>pH qiymati: <strong>{ph}</strong></label><input type="range" min="1" max="14" value={ph} onChange={e=>setPh(Number(e.target.value))}/><div className="ph-scale">{[1,3,5,7,9,11,13].map(v=><span key={v}>{v}</span>)}</div><div className="safety-note"><Beaker size={18}/><span>Bu faqat ta’limiy vizualizatsiya. Haqiqiy kimyoviy tajribada himoya qoidalariga rioya qiling.</span></div></section><section className="beaker-stage"><div className="beaker"><div style={{background:color,boxShadow:`0 0 30px ${color}55`}}/><i/><i/><i/></div><h3>{ph<7?'Kislotalik':ph>7?'Ishqoriy muhit':'Neytral eritma'}</h3><p>Fenolftalein indikator kabi o‘zgaruvchan belgilar pH ga bog‘liq.</p></section></div></>
 }

 const topics=[
  ['Atom tuzilishi','Proton, neytron va elektronlar atomning asosiy tarkibiy qismlaridir.','Z = p⁺ · A = p⁺ + n⁰','Zaryad, izotop, elektron konfiguratsiya'],
  ['Davriy qonun','Elementlar atom tartib raqamiga ko‘ra davriy xossalarga ega.','q = n·e','Guruh, davr, atom radiusi'],
  ['Kimyoviy bog‘lanish','Atomlar energetik jihatdan barqarorroq molekulalarni hosil qiladi.','ΔE = Emahsulot – Ereaktiv','Ion, kovalent, metall bog‘'],
  ['Kislotalar va asoslar','Kislota proton beradi, asos proton qabul qiladi.','pH = −lg[H⁺]','Neytrallanish, indikator'],
 ]
 function Library(){
  const [selected,setSelected]=useState(topics[0])
  return <><PageTitle eyebrow="BILIMLAR BANKI" title="Kimyo kutubxonasi" description="Asosiy tushunchalarni qisqa, amaliy va to‘g‘ri izohlarda o‘rganing."/><div className="library-layout"><aside>{topics.map(t=><button key={t[0]} className={selected[0]===t[0]?'active':''} onClick={()=>setSelected(t)}><Atom size={18}/><span>{t[0]}</span><ChevronRight size={16}/></button>)}</aside><article><span className="eyebrow">Asosiy tushuncha</span><h2>{selected[0]}</h2><p>{selected[1]}</p><div className="formula-box">{selected[2]}</div><h3>Muhim mavzular</h3><div className="tag-row">{selected[3].split(', ').map(t=><span key={t}>{t}</span>)}</div></article></div></>
 }

 function SearchPage(){
  const [params]=useSearchParams(),term=(params.get('q')||'').trim().toLowerCase()
  const results=[
   ...elements.filter(e=>`${e.name} ${e.uzName} ${e.symbol} ${e.number}`.toLowerCase().includes(term)).slice(0,8).map(e=>({title:e.uzName,meta:`Element · ${e.symbol} · ${e.number}`,to:'/periodic-table'})),
   ...navItems.filter(item=>item[1].toLowerCase().includes(term)).map(([to,label])=>({title:label,meta:'Asbob',to})),
   ...['Atom tuzilishi','Davriy jadval','Kimyoviy bog‘lanish','Kislota va asos','Termokimyo'].filter(x=>x.toLowerCase().includes(term)).map(x=>({title:x,meta:'Kutubxona mavzusi',to:'/library'})),
  ]
  return <><PageTitle eyebrow="QIDIRUV" title={`“${params.get('q')||''}” natijalari`} description="Elementlar, vositalar va o‘quv mavzulari bo‘yicha natijalar."/><div className="search-results">{term&&results.length?results.map(r=><NavLink key={r.title+r.to} to={r.to}><div><strong>{r.title}</strong><span>{r.meta}</span></div><ChevronRight size={18}/></NavLink>):<div className="empty-state"><Search size={30}/><h3>Natija topilmadi</h3><p>Boshqa kalit so‘z bilan urinib ko‘ring.</p></div>}</div></>
 }

 export default App

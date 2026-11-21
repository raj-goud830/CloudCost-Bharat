import React, {useEffect, useMemo, useState} from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import Recommendations from './components/Recommendations'
import {Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Boxes, CheckCircle2, Cloud, Download, Gauge, LayoutDashboard, Leaf, Menu, Search, Server, Settings, ShieldCheck, Wallet, X, Zap} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const money = n => n == null ? '—' : new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)
const fallback = {
 mode:'demo',currency:'INR',monthly_spend:68420,potential_savings:12860,resources_scanned:38,findings:4,carbon_avoided_kg:18.4,
 monthly_trend:[{month:'Jun',spend:54200},{month:'Jul',spend:57100},{month:'Aug',spend:55900},{month:'Sep',spend:63200},{month:'Oct',spend:61800},{month:'Nov',spend:68420}],
 category_breakdown:[{category:'Compute',spend:32800,share:48},{category:'Storage',spend:12400,share:18},{category:'Database',spend:15050,share:22},{category:'Networking',spend:8170,share:12}],
 inventory:[
 {id:'vol-0a12bc34',type:'EBS Volume',name:'legacy-db-data',region:'ap-south-1',status:'Unattached',age_days:42,monthly_cost:420,risk:'Check backups and owner before removal',recommendation:'Review and snapshot policy'},
 {id:'eipalloc-09ab12cd',type:'Elastic IP',name:'unused-public-ip',region:'ap-south-1',status:'Unassociated',age_days:19,monthly_cost:260,risk:'May incur public IPv4 charges',recommendation:'Confirm no DNS or failover dependency'},
 {id:'snap-0123abcd',type:'EBS Snapshot',name:'old-api-snapshot',region:'ap-south-1',status:'Older than 90 days',age_days:126,monthly_cost:180,risk:'Could be required for recovery/compliance',recommendation:'Validate retention requirements'},
 {id:'i-0abc1234',type:'EC2 Instance',name:'staging-worker',region:'ap-south-1',status:'Low utilization',age_days:0,monthly_cost:1850,risk:'CPU average below 5% in sample window',recommendation:'Review schedule or right-size'}
 ]}
const nav = [
  ['Overview', LayoutDashboard],
  ['Resource audit', Boxes],
  ['Cost optimization', Zap],
  ['FinOps learning', BarChart3],
  ['Cloud connection', Cloud]
]
function App(){
 const [data,setData]=useState(fallback),[page,setPage]=useState('Overview'),[query,setQuery]=useState(''),[modal,setModal]=useState(false),[role,setRole]=useState(''),[external,setExternal]=useState(''),[region,setRegion]=useState('ap-south-1'),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[mobile,setMobile]=useState(false)
 useEffect(()=>{fetch(`${API}/api/dashboard`).then(r=>r.ok?r.json():null).then(d=>d&&setData(d)).catch(()=>{})},[])
 const items=data.inventory||[]
 const filtered=useMemo(()=>items.filter(x=>[x.id,x.name,x.type,x.status].join(' ').toLowerCase().includes(query.toLowerCase())),[items,query])
 function exportCSV(){
  const rows=[['Resource ID','Type','Name','Region','Status','Age days','Monthly cost INR','Risk','Recommendation'],...filtered.map(x=>[x.id,x.type,x.name,x.region,x.status,x.age_days??'',x.monthly_cost??'',x.risk,x.recommendation])]
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\\n')
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='cloudcost-bharat-audit.csv';a.click();URL.revokeObjectURL(a.href)
 }
 async function scan(){
  setLoading(true);setNotice('')
  try{
   const res=await fetch(`${API}/api/scan`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role_arn:role,external_id:external,region})})
   const body=await res.json();if(!res.ok)throw new Error(body.detail||'Scan failed')
   setData(prev=>({...prev,mode:'live',inventory:body.findings,resources_scanned:body.resources_scanned,findings:body.findings.length}))
   setNotice(`Live inventory scan completed in ${region}. Cost figures remain demo estimates.`);setModal(false)
  }catch(e){setNotice(e.message)}finally{setLoading(false)}
 }
 async function restoreDemo(){
  try{
   const res=await fetch(`${API}/api/demo`);if(!res.ok)throw new Error('Could not load demo dataset')
   const demo=await res.json();setData(demo);setQuery('');setNotice('Demo dataset loaded. All displayed costs, savings and sample resources are synthetic. No AWS resources were created or changed.')
  }catch(e){setNotice(e.message)}
 }
 const isLive=data.mode==='live'
 return <div className="app">
  <aside className={`sidebar ${mobile?'show':''}`}>
   <div className="brand"><div className="brand-icon"><Wallet size={20}/></div><div><b>CloudCost</b><span>BHARAT</span></div><button className="close-mobile" onClick={()=>setMobile(false)}><X size={18}/></button></div>
   <div className="workspace"><div className="workspace-dot"/> Personal workspace <span className="chevron">⌄</span></div>
   <div className="nav-label">WORKSPACE</div>
   {nav.map(([name,Icon])=><button key={name} onClick={()=>{setPage(name);setMobile(false)}} className={`nav-item ${page===name?'active':''}`}><Icon size={17}/>{name}{name==='Resource audit'&&<small>{items.length}</small>}</button>)}
   <div className="nav-label second">PREFERENCES</div>
   <button className="nav-item"><Settings size={17}/>Settings</button>
   <div className="sidebar-bottom"><div className="help-icon">?</div><div><b>FinOps toolkit</b><span>Optimize your cloud spend</span></div></div>
  </aside>
  {mobile&&<div className="scrim" onClick={()=>setMobile(false)}/>}
  <main className="main">
   <header className="topbar"><button className="hamburger" onClick={()=>setMobile(true)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><div className={`mode ${isLive?'live':''}`}><i/>{isLive?'LIVE INVENTORY · DEMO COSTS':'DEMO MODE · SYNTHETIC'}</div><button className="icon-btn" title="Notifications"><Bell size={18}/><i/></button><div className="avatar">RG</div></div></header>
   <div className="content">
    {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
    {page==='Overview'&&<>
     <div className="page-heading"><div><div className="eyebrow">CLOUD FINANCIAL INTELLIGENCE</div><h1>Executive overview</h1><p>Monitor cloud spend, discover waste and make smarter infrastructure decisions.</p></div><div className="heading-actions">{isLive&&<button className="secondary" onClick={restoreDemo}>Restore demo data</button>}<button className="primary" onClick={()=>setModal(true)}><Cloud size={16}/> Connect AWS account</button></div></div>
     {isLive&&<div className="notice demo-cost-notice"><span>Inventory is live from AWS. Spend, savings and carbon figures below remain illustrative demo estimates.</span></div>}
     <div className="stats">
      <Stat icon={Wallet} label="Monthly cloud spend" value={money(data.monthly_spend)} trend={`+${data.month_over_month_change_pct ?? 10.7}%`} sub="vs. previous month · demo" color="blue"/>
      <Stat icon={Zap} label="Potential savings" value={money(data.potential_savings)} trend="18.8%" sub="of monthly spend" color="purple"/>
      <Stat icon={Boxes} label="Resources scanned" value={data.resources_scanned} trend="Across 4 types" sub="inventory coverage" color="green"/>
      <Stat icon={Leaf} label="Carbon impact* " value={`${data.carbon_avoided_kg} kg`} trend="Estimated" sub="potential CO₂e avoided" color="orange"/>
     </div>
     <section className="panel budget-panel"><div><div className="eyebrow">MONTHLY BUDGET · DEMO</div><h3>{money(data.monthly_spend)} <span>of {money(data.monthly_budget || 75000)}</span></h3><p>{data.budget_utilization_pct ?? 91.2}% of illustrative monthly budget used</p></div><div className="budget-track"><span style={{width:`${Math.min(data.budget_utilization_pct ?? 91.2,100)}%`}}/></div><div className="budget-foot"><span>Budget remaining</span><b>{money(Math.max(0,(data.monthly_budget || 75000)-data.monthly_spend))}</b></div></section>
     <div className="grid-main">
      <section className="panel spend-panel"><div className="panel-head"><div><h3>Cloud spend trajectory</h3><p>Monthly infrastructure cost · INR</p></div><span className="select-like">Last 6 months⌄</span></div><div className="chart-legend"><i/> Total spend</div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthly_trend} margin={{top:10,right:8,left:0,bottom:0}}><defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6d8cff" stopOpacity={.28}/><stop offset="95%" stopColor="#6d8cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 4" stroke="#253047" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:'#8290a8',fontSize:12}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#8290a8',fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`} width={38}/><Tooltip contentStyle={{background:'#151f32',border:'1px solid #2b3850',borderRadius:10,color:'#fff'}} formatter={v=>money(v)}/><Area type="monotone" dataKey="spend" stroke="#7892ff" strokeWidth={2.5} fill="url(#spendFill)"/></AreaChart></ResponsiveContainer></div></section>
      <section className="panel allocation"><div className="panel-head"><div><h3>Cost allocation</h3><p>Spend by service category</p></div><span className="dots">•••</span></div><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.category_breakdown} dataKey="spend" nameKey="category" innerRadius={65} outerRadius={88} paddingAngle={4} stroke="none">{data.category_breakdown.map((x,i)=><Cell key={x.category} fill={['#7791ff','#41c6a5','#b18cff','#f3b765'][i%4]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer><div className="donut-center"><b>{money(data.monthly_spend)}</b><span>Total spend</span></div></div><div className="legend">{data.category_breakdown.map((x,i)=><div key={x.category}><span><i style={{background:['#7791ff','#41c6a5','#b18cff','#f3b765'][i%4]}}/>{x.category}</span><b>{x.share}%</b></div>)}</div></section>
     </div>
     <section className="panel opportunities"><div className="panel-head"><div><h3>Optimization opportunities</h3><p>Review these findings to identify potential waste</p></div><button className="text-btn" onClick={()=>setPage('Resource audit')}>View all findings →</button></div><div className="op-list">{items.slice(0,3).map((x,i)=><div className="op-row" key={x.id}><div className={`op-icon op-${i}`}><Server size={17}/></div><div className="op-info"><b>{x.name}</b><span>{x.type} · {x.status}</span></div><div className="op-cost">{money(x.monthly_cost)}<span>est. monthly cost</span></div><span className="risk-pill">{x.age_days?`${x.age_days} days`:'Review'}</span></div>)}</div></section>
     <div className="footnote">Demo dataset: all spend, budget, savings, carbon and sample resource figures are synthetic for portfolio demonstration; they are not retrieved from AWS Cost Explorer. Live mode updates inventory only. Savings are review opportunities, not guaranteed reductions.</div>
    </>}
             {page === 'Resource audit' && <><div className="page-heading"><div><div className="eyebrow">CLOUD HYGIENE</div><h1>Resource inventory audit</h1><p>Review potentially idle resources before making infrastructure changes.</p></div><button className="primary" onClick={exportCSV}><Download size={16} /> Export CSV</button></div><div className="audit-summary"><div><b>{items.length}</b><span>Findings to review</span></div><div><b>{money(items.reduce((s, x) => s + (x.monthly_cost || 0), 0))}</b><span>Illustrative monthly cost</span></div><div><b>{isLive ? 'Live scan' : 'Sample inventory'}</b><span>Data source</span></div></div><section className="panel table-panel"><div className="table-toolbar"><div><h3>Detected resources</h3><p>Unattached, unassociated and low-utilization resources</p></div><div className="search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search resources..." /></div></div><div className="table-scroll"><table><thead><tr><th>RESOURCE</th><th>TYPE</th><th>STATUS</th><th>AGE</th><th>EST. COST / MO.</th><th>RECOMMENDATION</th></tr></thead><tbody>{filtered.map(x => <tr key={x.id}><td><b>{x.name}</b><small>{x.id}</small></td><td>{x.type}</td><td><span className="status-pill">{x.status}</span></td><td>{x.age_days == null ? '—' : `${x.age_days} days`}</td><td>{money(x.monthly_cost)}</td><td className="recommend">{x.recommendation}</td></tr>)}</tbody></table>{!filtered.length && <div className="empty">No matching resources found.</div>}</div></section><div className="warning"><ShieldCheck size={18} /><span><b>Safety first:</b> Findings are review candidates. Validate ownership, backups, retention, dependencies and compliance before changing or deleting any resource.</span></div></>}
             
{page === 'Cost optimization' && (
  <>
    <div className="page-heading">
      <div>
        <div className="eyebrow">FINOPS · COST MANAGEMENT</div>
        <h1>Cost optimization</h1>
        <p>
          Discover cloud waste and identify potential savings
          through resource-level recommendations.
        </p>
      </div>
    </div>

    <Recommendations />
  </>
)}

    {page==='FinOps learning'&&<><div className="page-heading"><div><div className="eyebrow">LEARN & PRACTICE</div><h1>FinOps learning center</h1><p>Build practical cloud financial management skills with these guided labs.</p></div></div><div className="learn-grid">{[['01','Understand your AWS bill','Learn how Cost Explorer, service dimensions and usage types help explain cloud spend.','AWS Cost Explorer'],['02','Find unattached EBS volumes','Use AWS CLI to list available volumes and inspect tags before cleanup.','EC2 · EBS'],['03','Audit Elastic IP addresses','Identify public IPv4 allocations without an associated resource.','EC2 · Networking'],['04','Right-size EC2 instances','Use CloudWatch CPU metrics as one input for sizing decisions.','CloudWatch · Compute'],['05','Apply tagging strategies','Create consistent cost-allocation tags for teams and environments.','Governance'],['06','Set budgets and alerts','Understand AWS Budgets and Cost Anomaly Detection.','Cost controls']].map(([n,t,d,tag])=><article className="learn-card" key={n}><div className="learn-number">{n}</div><h3>{t}</h3><p>{d}</p><span>{tag}</span></article>)}</div><section className="panel terminal"><div className="terminal-head"><div><span className="terminal-dot"/><span className="terminal-dot"/><span className="terminal-dot"/> <b>CLI practice · Read-only</b></div><span>Example command</span></div><pre><code>{`# List unattached EBS volumes in ap-south-1\naws ec2 describe-volumes \\\\\n  --region ap-south-1 \\\\\n  --filters Name=status,Values=available \\\\\n  --query 'Volumes[*].[VolumeId,Size,CreateTime]' \\\\\n  --output table`}</code></pre><p>This is a learning example. Run AWS CLI commands only in an account where you are authorized.</p></section></>}
    {page==='Cloud connection'&&<><div className="page-heading"><div><div className="eyebrow">INTEGRATIONS</div><h1>Cloud connection</h1><p>Connect an AWS account using a temporary, read-only IAM role session.</p></div></div><section className="panel connect-panel"><div className="connect-icon"><Cloud size={26}/></div><div><h3>Amazon Web Services</h3><p>Scan EC2, EBS, Elastic IP and CloudWatch inventory in a selected region.</p><div className="connect-tags"><span><CheckCircle2 size={13}/> Read-only access</span><span><ShieldCheck size={13}/> STS temporary credentials</span></div><button className="primary" onClick={()=>setModal(true)}>Configure AWS connection</button></div></section><div className="warning"><ShieldCheck size={18}/><span>Do not use root credentials or paste access keys here. The backend must have its own identity permitted to assume the target role. Deploy behind authentication before using with real customer accounts.</span></div></>}
   </div>
  </main>
  {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">SECURE INTEGRATION</div><h2>Connect AWS account</h2></div><button className="icon-btn" onClick={()=>setModal(false)}><X size={18}/></button></div><p className="modal-copy">Enter the ARN of a read-only IAM role created from the included CloudFormation template. The backend will request temporary credentials using STS.</p><label>IAM Role ARN<input value={role} onChange={e=>setRole(e.target.value)} placeholder="arn:aws:iam::123456789012:role/CloudCostBharatReadOnly"/></label><label>External ID<input value={external} onChange={e=>setExternal(e.target.value)} placeholder="Your unique external ID" type="password"/></label><label>AWS Region<select value={region} onChange={e=>setRegion(e.target.value)}><option value="ap-south-1">Asia Pacific (Mumbai) · ap-south-1</option><option value="ap-south-2">Asia Pacific (Hyderabad) · ap-south-2</option><option value="us-east-1">US East (N. Virginia) · us-east-1</option><option value="eu-west-1">Europe (Ireland) · eu-west-1</option></select></label><div className="modal-note"><ShieldCheck size={16}/> Credentials are temporary and used by the backend only. This scanner does not modify AWS resources.</div><div className="modal-actions"><button className="secondary" onClick={()=>setModal(false)}>Cancel</button><button className="primary" disabled={loading||!role||!external} onClick={scan}>{loading?'Scanning…':'Start read-only scan'}</button></div></div></div>}
 </div>
}
function Stat({icon:Icon,label,value,trend,sub,color}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${color}`}><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className="stat-bottom"><b>{trend}</b><span>{sub}</span></div></div>}
export default App

"use client";
import {useEffect,useMemo,useState} from "react";
import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";

type Status="Pending"|"In Progress"|"Completed"|"Cancelled";
type Task={id:number;name:string;client:string;category:string;price:number;deadline:string;status:Status;paid:number;notes:string};
type Client={id:number;name:string;notes:string};
type Category={id:number;name:string;defaultPrice:number};
type View="Dashboard"|"Tasks"|"Clients"|"Categories"|"Reports";

const seedTasks:Task[]=[
{id:1052,name:"MGT430 Final Report",client:"Ahmed",category:"Report",price:500,deadline:"2026-09-05",status:"In Progress",paid:0,notes:"1500 words + references"},
{id:1051,name:"Presentation",client:"Omar",category:"Presentation",price:350,deadline:"2026-09-06",status:"Completed",paid:350,notes:""},
{id:1050,name:"Research",client:"Ahmed",category:"Research",price:700,deadline:"2026-09-08",status:"Pending",paid:200,notes:"10 references"}];
const seedClients:Client[]=[{id:1,name:"Ahmed",notes:""},{id:2,name:"Omar",notes:""}];
const seedCats:Category[]=[{id:1,name:"Assignment",defaultPrice:300},{id:2,name:"Report",defaultPrice:500},{id:3,name:"Presentation",defaultPrice:350},{id:4,name:"Research",defaultPrice:700},{id:5,name:"Project",defaultPrice:900}];
const money=(n:number)=>new Intl.NumberFormat("en-EG").format(n)+" EGP";

function Dashboard({user}:{user:User}){
 const [view,setView]=useState<View>("Dashboard"),[tasks,setTasks]=useState<Task[]>([]),[clients,setClients]=useState<Client[]>([]),[cats,setCats]=useState<Category[]>([]);
 const [ready,setReady]=useState(false),[modal,setModal]=useState(false),[edit,setEdit]=useState<Task|null>(null),[q,setQ]=useState("");
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   try{
    const base=`users/${user.uid}`;
    const [ts,cs,ks]=await Promise.all([
     getDocs(collection(db,base,"tasks")),
     getDocs(collection(db,base,"clients")),
     getDocs(collection(db,base,"categories"))
    ]);
    if(cancelled)return;
    if(ts.empty&&cs.empty&&ks.empty){
     const localTasks:Task[]=JSON.parse(localStorage.getItem("tf.tasks")||JSON.stringify(seedTasks));
     const localClients:Client[]=JSON.parse(localStorage.getItem("tf.clients")||JSON.stringify(seedClients));
     const localCats:Category[]=JSON.parse(localStorage.getItem("tf.cats")||JSON.stringify(seedCats));
     const batch=writeBatch(db);
     localTasks.forEach(t=>batch.set(doc(db,base,"tasks",String(t.id)),t));
     localClients.forEach(c=>batch.set(doc(db,base,"clients",String(c.id)),c));
     localCats.forEach(c=>batch.set(doc(db,base,"categories",String(c.id)),c));
     await batch.commit();
     if(cancelled)return;
     setTasks(localTasks);setClients(localClients);setCats(localCats);
    }else{
     setTasks(ts.docs.map(d=>d.data() as Task).sort((a,b)=>b.id-a.id));
     setClients(cs.docs.map(d=>d.data() as Client));
     setCats(ks.docs.map(d=>d.data() as Category));
    }
   }catch(e){console.error("Firestore load failed",e)}
   finally{if(!cancelled)setReady(true)}
  }
  load();
  return()=>{cancelled=true};
 },[user.uid]);
 const active=tasks.filter(t=>t.status!=="Cancelled"),total=active.reduce((s,t)=>s+t.price,0),paid=active.reduce((s,t)=>s+Math.min(t.paid,t.price),0),unpaid=total-paid,completed=active.filter(t=>t.status==="Completed").length;
 const shown=useMemo(()=>active.filter(t=>`${t.name} ${t.client} ${t.category} ${t.id}`.toLowerCase().includes(q.toLowerCase())),[active,q]);
 const patch=async(id:number,d:Partial<Task>)=>{
  const current=tasks.find(t=>t.id===id);if(!current)return;
  const updated={...current,...d};
  setTasks(tasks.map(t=>t.id===id?updated:t));
  await setDoc(doc(db,"users",user.uid,"tasks",String(id)),updated);
 };
 const del=async(id:number)=>{
  if(!confirm("Delete this task?"))return;
  setTasks(tasks.filter(t=>t.id!==id));
  await deleteDoc(doc(db,"users",user.uid,"tasks",String(id)));
 };
 async function saveTask(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();let f=new FormData(e.currentTarget);
  let obj={name:String(f.get("name")),client:String(f.get("client")),category:String(f.get("category")),price:Number(f.get("price")),deadline:String(f.get("deadline")),status:String(f.get("status")) as Status,paid:Number(f.get("paid")||0),notes:String(f.get("notes")||"")};
  if(edit){
   const updated={...edit,...obj};
   setTasks(tasks.map(t=>t.id===edit.id?updated:t));
   await setDoc(doc(db,"users",user.uid,"tasks",String(edit.id)),updated);
  }else{
   const created:Task={id:Math.max(1000,...tasks.map(t=>t.id))+1,...obj};
   setTasks([created,...tasks]);
   await setDoc(doc(db,"users",user.uid,"tasks",String(created.id)),created);
  }
  setModal(false);setEdit(null);
 }
 const openEdit=(t:Task)=>{setEdit(t);setModal(true)};
 return <main className="shell"><aside><div className="brand"><span>TF</span>TaskFlow</div><nav>{(["Dashboard","Tasks","Clients","Categories","Reports"] as View[]).map(v=><button key={v} className={view===v?"selected":""} onClick={()=>setView(v)}>{v}</button>)}</nav><button className="settings">⚙ Settings</button></aside>
 <section className="content"><header><div><h1>{view}</h1><p>{view==="Dashboard"?"Track your work, deadlines and income.":"Manage your "+view.toLowerCase()+"."}</p></div><div className="headerActions"><button className="logout" onClick={()=>signOut(auth)}>Sign out</button><button className="primary" onClick={()=>{setEdit(null);setModal(true)}}>＋ Add Task</button></div></header>
 {view==="Dashboard"&&<><div className="cards"><article><small>Total Tasks</small><strong>{active.length}</strong><em>All active work</em></article><article><small>Completed</small><strong>{completed}</strong><em>{active.length?Math.round(completed/active.length*100):0}% completion rate</em></article><article><small>Total Value</small><strong>{money(total)}</strong><em>All task value</em></article><article className="danger"><small>Remaining</small><strong>{money(unpaid)}</strong><em>Still to collect</em></article></div>
 <div className="grid"><article className="panel"><div className="panelTitle"><div><h2>Income Overview</h2><p>Received vs remaining</p></div><b>{money(paid)}</b></div><div className="bigProgress"><i style={{width:`${total?paid/total*100:0}%`}}/></div><div className="split"><span>Received <b>{money(paid)}</b></span><span>Remaining <b>{money(unpaid)}</b></span></div></article>
 <article className="panel"><h2>Quick Summary</h2><div className="summary">{(["In Progress","Pending","Completed"] as Status[]).map(s=><div key={s}><span>{s}</span><b>{active.filter(t=>t.status===s).length}</b></div>)}</div></article></div><TaskTable tasks={shown} q={q} setQ={setQ} patch={patch} openEdit={openEdit} del={del}/></>}
 {view==="Tasks"&&<TaskTable tasks={shown} q={q} setQ={setQ} patch={patch} openEdit={openEdit} del={del}/>}
 {view==="Clients"&&<article className="panel"><div className="panelTitle"><div><h2>Clients</h2><p>Balances are calculated automatically.</p></div><button className="mini" onClick={async()=>{let n=prompt("Client name");if(n){let c:Client={id:Date.now(),name:n,notes:""};setClients([...clients,c]);await setDoc(doc(db,"users",user.uid,"clients",String(c.id)),c)}}}>+ Client</button></div><div className="clientGrid">{clients.map(c=>{let x=active.filter(t=>t.client===c.name),tv=x.reduce((s,t)=>s+t.price,0),pr=x.reduce((s,t)=>s+t.paid,0);return <div className="clientCard" key={c.id}><h3>{c.name}</h3><p>{x.length} tasks</p><strong>{money(tv-pr)}</strong><small>remaining</small></div>})}</div></article>}
 {view==="Categories"&&<article className="panel"><div className="panelTitle"><div><h2>Categories</h2><p>Set a default price for recurring work.</p></div><button className="mini" onClick={async()=>{let n=prompt("Category name");let p=prompt("Default price");if(n&&p){let c:Category={id:Date.now(),name:n,defaultPrice:Number(p)};setCats([...cats,c]);await setDoc(doc(db,"users",user.uid,"categories",String(c.id)),c)}}}>+ Category</button></div>{cats.map(c=><div className="categoryRow" key={c.id}><b>{c.name}</b><span>{money(c.defaultPrice)}</span></div>)}</article>}
 {view==="Reports"&&<article className="panel report"><h2>Performance Report</h2><div className="reportGrid"><div><small>Total Work</small><b>{money(total)}</b></div><div><small>Received</small><b>{money(paid)}</b></div><div><small>Outstanding</small><b>{money(unpaid)}</b></div><div><small>Average Task</small><b>{money(active.length?Math.round(total/active.length):0)}</b></div></div><h3>Top Clients</h3>{clients.map(c=><div className="categoryRow" key={c.id}><span>{c.name}</span><b>{money(active.filter(t=>t.client===c.name).reduce((sum,t)=>sum+t.price,0))}</b></div>)}</article>}
 </section>
 {modal&&<div className="overlay" onMouseDown={()=>{setModal(false);setEdit(null)}}><form className="modal" onSubmit={saveTask} onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><h2>{edit?"Edit Task":"Add New Task"}</h2><p>Task, client, price and payment.</p></div><button type="button" onClick={()=>setModal(false)}>×</button></div>
 <label>Task name<input required name="name" defaultValue={edit?.name}/></label><div className="two"><label>Client<select name="client" defaultValue={edit?.client}>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></label><label>Category<select name="category" defaultValue={edit?.category}>{cats.map(c=><option key={c.id}>{c.name}</option>)}</select></label></div>
 <div className="two"><label>Price<input required type="number" name="price" defaultValue={edit?.price}/></label><label>Received<input type="number" name="paid" defaultValue={edit?.paid||0}/></label></div><div className="two"><label>Deadline<input required type="date" name="deadline" defaultValue={edit?.deadline}/></label><label>Status<select name="status" defaultValue={edit?.status||"Pending"}><option>Pending</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></label></div><label>Notes<textarea name="notes" defaultValue={edit?.notes}/></label><div className="modalActions"><button type="button" onClick={()=>setModal(false)}>Cancel</button><button className="primary">{edit?"Save Changes":"Add Task"}</button></div></form></div>}
 </main>
}
export default function Home(){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setLoading(false)}),[]);
 async function login(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  const f=new FormData(e.currentTarget);
  try{await signInWithEmailAndPassword(auth,String(f.get("email")),String(f.get("password")))}
  catch(err:any){setError(err?.code==="auth/invalid-credential"?"Invalid email or password.":err?.message||"Login failed.")}
 }
 if(loading)return <main className="authPage"><div className="authCard"><b>Loading TaskFlow…</b></div></main>;
 if(!user)return <main className="authPage"><form className="authCard" onSubmit={login}><div className="authLogo">TF</div><h1>TaskFlow</h1><p>Sign in to your private workspace.</p>{error&&<div className="authError">{error}</div>}<label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label><button className="primary authButton">Login</button></form></main>;
 return <Dashboard user={user}/>;
}

function TaskTable({tasks,q,setQ,patch,openEdit,del}:{tasks:Task[];q:string;setQ:(x:string)=>void;patch:(id:number,d:Partial<Task>)=>void;openEdit:(t:Task)=>void;del:(id:number)=>void}){
 return <article className="panel tasks"><div className="toolbar"><div><h2>Tasks</h2><p>Search and use quick actions.</p></div><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search task, client, ID..."/></div><div className="tableWrap"><table><thead><tr><th>Task</th><th>Client</th><th>Deadline</th><th>Status</th><th>Price</th><th>Payment</th><th>Actions</th></tr></thead><tbody>{tasks.map(t=>{let remain=Math.max(0,t.price-t.paid),ps=remain===0?"Paid":t.paid>0?"Partial":"Unpaid";return <tr key={t.id}><td><b>{t.name}</b><small>#{t.id} · {t.category}</small></td><td>{t.client}</td><td>{t.deadline}</td><td><span className={"pill "+t.status.replaceAll(" ","").toLowerCase()}>{t.status}</span></td><td><b>{money(t.price)}</b></td><td><span className={"pill "+ps.toLowerCase()}>{ps}</span><small>{remain?money(remain)+" left":""}</small></td><td className="actions">{t.status!=="Completed"&&<button onClick={()=>patch(t.id,{status:"Completed"})}>✓</button>}{remain>0&&<button onClick={()=>patch(t.id,{paid:t.price})}>$</button>}<button onClick={()=>openEdit(t)}>✎</button><button onClick={()=>del(t.id)}>×</button></td></tr>})}</tbody></table></div></article>
}

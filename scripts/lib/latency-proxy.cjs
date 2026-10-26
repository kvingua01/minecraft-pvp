const net=require('node:net');
async function latencyProxy(port,delay=80){
 const sockets=new Set(),timers=new Set();let counter=0;
 const server=net.createServer(client=>{const upstream=net.connect({host:'127.0.0.1',port});sockets.add(client);sockets.add(upstream);
  for(const [from,to]of [[client,upstream],[upstream,client]]){let last=0;from.on('data',data=>{const when=Math.max(last+1,Date.now()+delay+([0,15,-10,5][counter++%4]));last=when;const timer=setTimeout(()=>{timers.delete(timer);if(!to.destroyed)to.write(data);},Math.max(0,when-Date.now()));timers.add(timer);});from.on('error',()=>to.destroy());from.on('close',()=>{sockets.delete(from);to.destroy();});}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));return {port:server.address().port,close:async()=>{for(const t of timers)clearTimeout(t);for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}};
}
module.exports={latencyProxy};

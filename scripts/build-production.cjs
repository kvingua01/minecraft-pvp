const {spawn}=require('node:child_process'),dns=require('node:dns/promises'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const args=['build','--progress=plain'],useProxy=process.argv.includes('--environment-proxy');let temporary=null;
 try{
  if(useProxy){
   args.push('--network=host');const hosts=new Set();
   for(const name of ['HTTPS_PROXY','HTTP_PROXY','NO_PROXY'])if(process.env[name]){args.push('--build-arg',name);if(name!=='NO_PROXY')hosts.add(new URL(process.env[name]).hostname);}
   for(const host of hosts){const {address}=await dns.lookup(host,{family:4});args.push('--add-host',host+':'+address);}
   const certs=[...new Set([process.env.NODE_EXTRA_CA_CERTS,process.env.SSL_CERT_FILE].filter(Boolean))].filter(file=>fs.existsSync(file));
   if(certs.length){temporary=fs.mkdtempSync(path.join(os.tmpdir(),'blockward-build-'));const bundle=path.join(temporary,'ca.pem');fs.writeFileSync(bundle,certs.map(file=>fs.readFileSync(file,'utf8').trim()).join('\n')+'\n',{mode:0o600});args.push('--secret','id=build_ca,src='+bundle);
    // Only the local proxy build needs BuildKit secrets; Railway sees a plain Dockerfile.
    const source=fs.readFileSync(path.resolve(__dirname,'../Dockerfile'),'utf8');
    if(!source.includes('RUN npm ci'))throw Error('Expected production install instruction');
    const localFile=path.join(temporary,'Dockerfile');
    fs.writeFileSync(localFile,source.replace('RUN npm ci','RUN --mount=type=secret,id=build_ca NODE_EXTRA_CA_CERTS=/run/secrets/build_ca npm ci'));
    args.push('--file',localFile);}
  }
  args.push('-t','blockward:phase6','.');const child=spawn('docker',args,{cwd:path.resolve(__dirname,'..'),stdio:'inherit'});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});process.exitCode=code===null?1:code;
 }finally{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});}
})().catch(e=>{console.error('Production image build failed:',e.code||e.name);process.exitCode=1;});

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Local setup only. Preserve provider credentials and existing generated secrets.
const root=resolve(import.meta.dirname,"../..");
const local=resolve(root,"helpdesk-php/var/mysql");
const tls=resolve(root,"helpdesk-php/var/mysql-tls");
mkdirSync(local,{recursive:true});mkdirSync(tls,{recursive:true});
const secretFile=resolve(local,".env.local");
if(!existsSync(secretFile))writeFileSync(secretFile,
  `LOCAL_HELPDESK_MYSQL_PASSWORD=${randomBytes(32).toString("hex")}\nLOCAL_HELPDESK_MYSQL_ROOT_PASSWORD=${randomBytes(32).toString("hex")}\n`,{mode:0o600});
const values=Object.fromEntries(readFileSync(secretFile,"utf8").trim().split(/\r?\n/).map(line=>line.split("=")));
if(!/^[a-f0-9]{64}$/.test(values.LOCAL_HELPDESK_MYSQL_PASSWORD??"") || !/^[a-f0-9]{64}$/.test(values.LOCAL_HELPDESK_MYSQL_ROOT_PASSWORD??""))throw new Error("Invalid local MySQL credential file; existing secrets were preserved");
function docker(args) {
  const r=spawnSync("docker",args,{cwd:root,encoding:"utf8",windowsHide:true});
  if(r.status!==0)throw new Error(`Local TLS setup failed (${args[0]}); inspect the container without printing credentials`);
}
if(!existsSync(resolve(tls,"ca.pem")) || !existsSync(resolve(tls,"server-cert.pem")) || !existsSync(resolve(tls,"server-key.pem"))) {
  const container=process.env.HELPDESK_SETUP_CONTAINER || "studiohub-helpdesk-php-1";
  const dir="/tmp/studiohub-helpdesk-mysql-tls";
  docker(["exec",container,"mkdir","-p",dir]);
  docker(["exec",container,"openssl","req","-x509","-newkey","rsa:2048","-nodes","-sha256","-days","3650","-subj","/CN=StudioHub-Helpdesk-Local-CA","-keyout",`${dir}/ca-key.pem`,"-out",`${dir}/ca.pem`]);
  docker(["exec",container,"openssl","req","-newkey","rsa:2048","-nodes","-sha256","-subj","/CN=helpdesk-db","-addext","subjectAltName=DNS:helpdesk-db,DNS:localhost,IP:127.0.0.1","-keyout",`${dir}/server-key.pem`,"-out",`${dir}/server.csr`]);
  docker(["exec",container,"openssl","x509","-req","-in",`${dir}/server.csr`,"-CA",`${dir}/ca.pem`,"-CAkey",`${dir}/ca-key.pem`,"-CAcreateserial","-days","825","-sha256","-copy_extensions","copy","-out",`${dir}/server-cert.pem`]);
  // The read-only private Docker mount must be readable by the mysql OS user.
  docker(["exec",container,"chmod","644",`${dir}/server-key.pem`]);
  for(const file of ["ca.pem","server-cert.pem","server-key.pem"]) docker(["cp",`${container}:${dir}/${file}`,resolve(tls,file)]);
}
const envFile=resolve(root,"helpdesk-php/.env");
let contents=existsSync(envFile)?readFileSync(envFile,"utf8"):"";
const updates={HELPDESK_DATABASE_URL:"mysql:host=127.0.0.1;port=3308;dbname=studiohub_helpdesk_dev;charset=utf8mb4",HELPDESK_DB_USER:"helpdesk_app",HELPDESK_DB_PASSWORD:values.LOCAL_HELPDESK_MYSQL_PASSWORD,HELPDESK_DB_SSL_CA:resolve(tls,"ca.pem").replaceAll("\\","/")};
for(const [key,value] of Object.entries(updates)) {
  const pattern=new RegExp(`^${key}=.*$`,"m");
  contents=pattern.test(contents)?contents.replace(pattern,()=>`${key}=${value}`):contents.replace(/\s*$/,"")+`\n${key}=${value}\n`;
}
writeFileSync(envFile,contents,{mode:0o600});
// Make the repository's documented `docker compose --env-file .env.compose ...`
// keep MySQL selected after a full down/up, not only this one setup invocation.
const composeEnv=resolve(root,".env.compose");
if(!existsSync(composeEnv))throw new Error("Run node scripts/setup-docker.mjs first to prepare .env.compose");
let composeContents=readFileSync(composeEnv,"utf8");
const existingFiles=composeContents.match(/^COMPOSE_FILE=(.*)$/m)?.[1]?.trim();
const mysqlFiles="docker-compose.yml;helpdesk-php/docker-compose.mysql.yml";
if(existingFiles && existingFiles!==mysqlFiles)throw new Error("Custom COMPOSE_FILE found; existing Compose selection was preserved. Add the Helpdesk MySQL overlay to that selection explicitly.");
for(const [key,value] of Object.entries({
  LOCAL_HELPDESK_MYSQL_PASSWORD:values.LOCAL_HELPDESK_MYSQL_PASSWORD,
  LOCAL_HELPDESK_MYSQL_ROOT_PASSWORD:values.LOCAL_HELPDESK_MYSQL_ROOT_PASSWORD,
  COMPOSE_PATH_SEPARATOR:";",COMPOSE_FILE:mysqlFiles,
})) {
  const pattern=new RegExp(`^${key}=.*$`,"m");
  composeContents=pattern.test(composeContents)?composeContents.replace(pattern,()=>`${key}=${value}`):composeContents.replace(/\s*$/,"")+`\n${key}=${value}\n`;
}
writeFileSync(composeEnv,composeContents,{mode:0o600});
const portableIni=resolve(root,"helpdesk-php/.runtime/php.ini");
if(existsSync(portableIni) && existsSync(resolve(root,"helpdesk-php/.runtime/php/ext/php_openssl.dll"))) {
  const ini=readFileSync(portableIni,"utf8");
  if(!/^\s*extension\s*=\s*(?:php_)?openssl(?:\.dll)?\s*$/m.test(ini))writeFileSync(portableIni,ini.replace(/\s*$/,"")+"\nextension=openssl\n");
}
console.log("Local Helpdesk MySQL credentials/TLS prepared; provider settings preserved. Standard Compose commands now select the MySQL overlay automatically.");

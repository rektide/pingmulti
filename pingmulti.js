#!/usr/bin/env node
"use strict"
var
  byline= require( "byline"),
  dns= require( "dns"),
  most= require( "most"),
  pmap= require( "most-pmap"),
  mri= require( "mri"),
  ping= require( "net-ping"),
  promisify= require( "es6-promisify"),
  dnsResolve= promisify(dns.resolve4, dns)

function args( argv){
	argv= argv|| process.argv.slice( 2)
	return mri(argv, {
		alias: {
			timeout: "t",
			parallel: "p"
		}
	})
}

function pickRandom( arr){
	var i= Math.floor( Math.random()* arr.length)
	return arr[i]
}

var _ip= /\(d{1,3}\.\d{1,3}\.\(d{1,3}\.\d{1,3}/
async function findIp( address){
	if( _ip.test( address)){
		return address
	}
	return await dnsResolve( address).then( pickRandom)
}

function run(lines, args){
	async function runPing( address){
		var ip= await findIp( address)
		return new Promise(( resolve, reject)=> {
			session.pingHost( ip,( err, target, sent, recvd)=> {
				if( err){
					reject( err)
					return
				}
				var ms= recvd.getTime()- sent.getTime()
				resolve({ ms, address})
			})
		})
	}

	if( !lines){
		process.stdin.setEncoding( "utf8")
		lines= byline.createStream( process.stdin)
	}
	args= args|| module.exports.args()
	var
	  parallel= parseInt(args.parallel)|| 2,
	  session= ping.createSession( args),
	  lineStream= most.fromEvent( 'data', lines).multicast(),
	  output= pmap(runPing, lineStream, parallel)
	output.drain().then(function(){
		session.close()
	})
	return output
}

function main(){
	run().forEach(x=> console.log(x.ms.toString(), x.address))
}

module.exports= run
module.exports.args= args
module.exports.main= main
module.exports.run= run

if( require.main=== module){
	main()
}

#!/usr/bin/env node
"use strict"
var
  byline= require( "byline"),
  most= require( "most"),
  pmap= require( "most-pmap"),
  mri= require( "mri"),
  ping= require( "net-ping")

function args( argv){
	argv= argv|| process.argv.slice( 2)
	return mri(argv, {
		alias: {
			timeout: 't',
			count: 'c',
			parallel: 'p'
		},
		default: {
			parallel: 4
		}
	})
}

function times( x, n){
	var result= new Array( n)
	for( var i= 0; i< n; ++i){
		console.log("el", i, n)
		result[ i]= x
	}
	return result
}

function run(lines, args){
	if( !lines){
		process.stdin.setEncoding( "utf8")
		lines= byline.createStream( process.stdin)
	}
	args= args|| module.exports.args()
	var
	  parallel= parseInt(args.parallel)|| 4,
	  session= ping.createSession( args),
	  lineStream= most.fromEvent( 'data', lines).multicast(),
	  lineStreams= most.from( times( lineStream, args.count|| 1)),
	  scanout= most.mergeConcurrently(1, lineStreams),
	  output= pmap(function( address){
		console.log({address})
		return new Promise(( resolve, reject)=> {
			console.log("trying", address)
			session.pingHost( address, (err, target, sent, recvd)=> {
				if( err){
					reject(err)
					return
				}
				var ms= recvd.getTime()- sent.getTime()
				console.log("resolve", ms, address)
				resolve({ms, address})
			})
		})
	  }, scanout, parallel)
	return output
}

function main(){
	run().forEach(x=> console.log(x.ms, x.address, x))
}

module.exports= run
module.exports.args= args
module.exports.main= main
module.exports.run= run

if( require.main=== module){
	main()
}

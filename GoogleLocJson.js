
/*
 * Server side Proxy to avoid same-origin rule.
 * you can by-pass server-side proxy by JSONP 
 * The first limitation to this method is that you have to rely on the provider to implement JSONP. 
 * The provider needs to actually support JSONP -- they need to wrap their JSON data with 
 * that callback function name.
 *
 * Then the next limitation -- and this is a big one -- is that JSONP doesn't support POST requests. 
 * Since all data is passed in the query string as GET data, you are severely limited if your 
 * services require the passing of long data (for example, forum posts or comments or articles). 
 * But for the majority of consumer services that fetch more data than they push, 
 * this isn't such a big problem.
 */
var fs			= require('fs')
   ,sys         = require('sys')
   ,path        = require('path')
   ,net			= require('net')
   ,EventEmitter = require('events').EventEmitter
   ,http        = require('http')

// Constructor
var GoogleLocJson = module.exports.GoogleLocJson = function(client){
    this.host = 'www.google.com';  // No http:// prefix !!!
    this.URL = '/loc/json';
    this.header = {'host': this.host,  port:80, path:this.URL, method:'POST', 'content-type': 'application/json'}

    client.on("message", this.handleMsg.bind(this));
    client.on("disconnect", this.quit.bind(this));
	client.on("end", this.quit.bind(this));
    this.client = client;

    this.httpclient = http.createClient(80, this.host);
    this.reqjson = {};
    this.reqjson['version'] = '1.1.0';
    this.reqjson['host'] = 'maps.google.com';

    this.httpclient.on('error', function(exception) {
      console.log("Google locjson lookup exception:");
      console.log(JSON.stringify(exception, null, 2));
    });
	console.log('GoogleLocJson constructor...');
};

// Prototype Inheritance
sys.inherits(GoogleLocJson, EventEmitter)

// this is to handle single event from one client.
// if you want broadcast this event to all client, emit this events, handle it in upper layer!!!
GoogleLocJson.prototype.handleMsg = function(message){
    event = JSON.parse(message);
    console.log(message);
    switch(event.method){
		case "resolvewifi":
			console.log("Resolving wifi...", event.data);
			this.resolve(event.data);
            break;
        default:
            console.log('Unknown handleMsg:'+message);
            break;
    }
};

// add one client into the list
GoogleLocJson.prototype.resolve = function(lbssids){
    console.log('GoogleLocJson resolve :' + this.client.sessionId);

    var that = this;
    this.reqjson['wifi_towers'] = [];
    var appendssid = function(reqjson){
        return function(bssid){
            console.log('appending wifi bssid:', bssid);
            reqjson['wifi_towers'].push({'mac_address':bssid});
        }
    }(this.reqjson);  // close over this.reqjson

    lbssids.forEach(function(bssid){that.reqjson['wifi_towers'].push({'mac_address':bssid})});
    //lbssids.forEach(appendssid);

    console.log('reqjson:', this.reqjson);

    //this.request = this.httpclient.request("POST", this.URL, this.reqjson);
    this.request = this.httpclient.request("POST", this.URL, this.header);
    this.request.write(JSON.stringify(this.reqjson));
    this.request.end();

    var handleResp = function(client){
        return function(data){
        };
    }(this.client);

    // nested scope. variables(buffer, that) can be refered from deep callback!!
    this.request.on('response', function(resp) {
      var buffer = '';  // private buff for resp callback func.
      //console.log('response:', resp.statusCode);
      //console.log('HEADERS: ' + JSON.stringify(resp.headers));

      resp.on('data', function(chunk) { buffer += chunk; console.log('data:', buffer);});
      resp.on('end', function() {
        console.log('GotData:', buffer);
        // Not a single parsing effort on server side,stream to client.
        that.client.send(JSON.stringify({'method':'wifiloc', 'data':buffer}));
      });
    });
};

GoogleLocJson.prototype.formatData = function(data){
	//console.log(Object.keys(tweet));
	console.log('formatData:'+data);
};

GoogleLocJson.prototype.quit = function(){
    console.log('client disconnected...'+this.client);

    if(this.timerhandler){
        console.log('clear interval upon disconnect...');
        clearInterval(this.timerhandler);
        this.timerhandler = null;
    }

    if(this.daemon){
        console.log('kill daemon status');
        this.daemon.kill();
        this.daemon = null;
    }
}

exports.GoogleLocJson = GoogleLocJson;

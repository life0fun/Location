var fs			= require('fs')
   ,sys         = require('sys')
   ,path        = require('path')
   ,net			= require('net')
   ,LineReader  = require('./lib/FileLineReader').FileLineReader
   ,EventEmitter = require('events').EventEmitter
   ,TwitterRestNode = require('./TwitterRestNode').TwitterRestNode

// Constructor
var RealtimeClient = module.exports.RealtimeClient = function(client){
    this.daemon = null;
    this.timerhandler = null;

    client.removeAllListeners("message");
    client.on("message", this.handleMsg.bind(this));
    client.on("disconnect", this.quit.bind(this));
	client.on("end", this.quit.bind(this));
    //cookies = cookieParser(client.request.headers.cookie);

    this.client = client;
};

// Prototype Inheritance
sys.inherits(RealtimeClient, EventEmitter)

RealtimeClient.prototype.getEvents = function(callback) {
    var flr = new LineReader(this.streamfile);
    while((line = flr.currentLine()) != null){
        console.log('===> '+line);
		callback(line);
		flr.moveToNextLine();
    }
}

RealtimeClient.prototype.quit = function(){
    console.log('Realtime client disconnected...'+this.client);
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

// this is to handle single event from one client.
// if you want broadcast this event to all client, emit this events, handle it in upper layer!!!
RealtimeClient.prototype.handleMsg = function(message){
    event = JSON.parse(message);
    console.log(message);
    switch(event.method){
		case "realtimestreaming":
			console.log("start real time streaming with interval:"+event.interval);
			this.streamingTwitter(event.interval);
			//this.streamingFacebook(event.interval);
			break;
        case "broadcast":
            console.log("track handle broadcast");
            //this.emit("event", event, this);
            break;
        default:
            console.log('Unknown Track handleMsg:'+message);
            break;
    }
}

RealtimeClient.prototype.streamingTwitter = function(interval){
	var self = this;
    var twit = new TwitterRestNode('locstream', 'locstream1');
    
    twit.on('twitLocation', function(data){
        console.log('streamingTwit data....'+data);
        var socket = self.client;
        sys.log('----socket---:'+socket+'\n');
        sys.log(data);
		var formatdata = self.formatStatusData(data);
		socket.send(JSON.stringify({'method':'marker', 'data':formatdata}));
    });

	var cbTimeout = function(twitnode){
		return function(){
            sys.log('timer expired...twit is:'+ twitnode);
            twitnode.RestApi()
        }
    }(twit)
    this.timerhandler = setInterval(cbTimeout, 10*1000); // every min.
}

RealtimeClient.prototype.streamingFacebook = function(interval){
	var self = this;
	console.log('start streaming facebook every:'+interval);
	var fbpath = "/Users/e51141/macsrc/graph/facebook-pysdk/mysrc/"
	   ,fbfile = fbpath+"/fb_graph.py"
	   ,spawn = require('child_process').spawn;

	var cbTimeout = function(socket){
		return function(){
            this.daemon = spawn(fbfile, [], {cwd:fbpath}); 
            this.daemon.on('exit', function(code){
                sys.log('fbstat exit code:'+code);
				this.daemon.stdin.end();
                this.daemon = null;
            });
            
            this.daemon.stdout.on('data', function(data){
                sys.log('----socket---:'+socket+'\n');
                sys.log(data);
				var formatdata = self.formatStatusData(data);
				socket.send(JSON.stringify({'method':'marker', 'data':formatdata}));
				//console.log('sending:'+JSON.stringify(data));
            });
        }
    }(self.client);
    this.timerhandler = setInterval(cbTimeout, 10*1000); // every min.
}

RealtimeClient.prototype.streamingTwitterPython = function(interval){
	var self = this;
	console.log('start streaming twitter every:'+interval);
	var twpath = "/Users/e51141/macsrc/graph/facebook-pysdk/mysrc/"
	   ,twfile = twpath+"/tw_userline.py"
	   ,spawn = require('child_process').spawn;

	var cbTimeout = function(socket){
		return function(){
            this.daemon = spawn(twfile, [], {cwd:twpath}); 
            this.daemon.on('exit', function(code){
                sys.log('twstat exit code:'+code);
				this.daemon.stdin.end();
                this.daemon = null;
            });
            
            this.daemon.stdout.on('data', function(data){
                sys.log('----socket---:'+socket+'\n');
                sys.log(data);
				var formatdata = self.formatStatusData(data);
				socket.send(JSON.stringify({'method':'marker', 'data':formatdata}));
				//console.log('sending:'+JSON.stringify(data));
            });
        }
    }(self.client);
    this.timerhandler = setInterval(cbTimeout, 10*1000); // every min.
}

RealtimeClient.prototype.sendLocation = function(lat, lng){
	var latlng = {'lat':lat, 'lgt':lng};
	console.log('RealtimeClient: send fix:', lat, lng, ' data:' + JSON.stringify(latlng));
	this.client.send(JSON.stringify({'method':'marker', 'data':JSON.stringify(latlng)}));
}

RealtimeClient.prototype.formatStatusData = function(data){
	var datastr = data.toString('ascii');
	console.log(datastr);
	if(typeof(data) !== 'string'){
		for(var k in data){
			//console.log(k + ':'+data[k]);
		}
	}

	var arr = datastr.split(',');
	var o = {};
	for(var id in arr){
		o[arr[id].split(':')[0]] = arr[id].split(':')[1];
	}
	console.log(o);
	return JSON.stringify(o);
}

exports.RealtimeClient = RealtimeClient;

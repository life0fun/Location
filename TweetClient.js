var fs			= require('fs')
   ,sys         = require('sys')
   ,path        = require('path')
   ,net			= require('net')
   ,EventEmitter = require('events').EventEmitter
   ,TwitterNode = require('twitter-node').TwitterNode

// Constructor
var TweetClient = module.exports.TweetClient = function(){
	this.twit = new TwitterNode({
		//user: user,
		//password:pass,
		//host: 'wwwgate0.mot.com',
		//port: 1080,
		headers: {'Authorization' : 'Basic bGlmZTBmdW46JEt1bk1pbmcx'}  // my login base64
	   //,locations: [-88.3, 41.5, -87.3, 42.5]		// tweets in Chicago
	});

	console.log('TweetClient Node constructor...');
	// http://dev.twitter.com/pages/streaming_api_methods#methods
	// statuses/[filter, retweet, firehose]
	this.twit.action = 'filter'; // 'filter' is default, firehose does not work.
	
	// Make sure you listen for errors, otherwise
	// they are thrown
	this.twit.addListener('error', function(error) {
	  console.log(error.message);
	});
	this.twit.addListener('limit', function(limit){
		sys.puts("LIMIT: " + sys.inspect(limit));
	});
	this.twit.addListener('delete', function(del) {
		sys.puts("DELETE: " + sys.inspect(del));
	});
	this.twit.addListener('end', function(resp) {
		sys.puts("wave goodbye... " + resp.statusCode);
	});

    this.clients = [];
	this.keywords = [];
	this.twit.track('xoom');
	this.twit.track('atrix');
	this.twit.track('droid');
	this.twit.track('motorola');

	console.log('TweetClient constructor...');
};

// Prototype Inheritance
sys.inherits(TweetClient, EventEmitter)

// add one client into the list
TweetClient.prototype.add = function(client){
    console.log('TweetClient add :' + client.sessionId);

    this.clients.push(client);
    client.removeAllListeners("message");
    client.on("message", this.handleMsg.bind(this));

    client.on("disconnect", this.quit.bind(this, client));
	client.on("end", this.quit.bind(this, client));
}

// a client disconnected.
TweetClient.prototype.quit = function(who){
    console.log('client disconnected...'+who.sessionId);
    var clients = this.clients
        ,len = clients.length
    
    while(len--){
        if(clients[len] == who){
            console.log('removing client from lists:'+clients[len].sessionId);
            clients.splice(len, 1);
        }
    }

    // stop streaming if no clients
    if(!clients.length){
        stopStreaming();
    }
}

// this is to handle single event from one client.
// if you want broadcast this event to all client, emit this events, handle it in upper layer!!!
TweetClient.prototype.handleMsg = function(message){
    event = JSON.parse(message);
    console.log(message);
    switch(event.method){
		case "twitterstreaming":
			console.log("sart twitter monitor streaming");
			this.streamingTweet();
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

TweetClient.prototype.addKeyword = function(keyword){
	this.keywords.push(keyword);
	this.twit.track(this.keywords);
}

TweetClient.prototype.addLocation = function(lat1, lng1, lat2, lng2){
	this.twit.location(lat1, lng1, lat2, lng2);
}

TweetClient.prototype.addParams = function(key, value){
	// http://dev.twitter.com/pages/streaming_api
	this.twit.params[key] = value;
}

TweetClient.prototype.startStreaming = function(){
	var self = this;
	// adds to the track array set above
    //self.twit.follow(3743661);  //curl http://api.twitter.com/1/users/show.xml?screen_name='locstream'
	self.twit.params['delimited'] = 'length';
	//self.twit.location(-88.3, 41.5, -87.3, 42.5);

	self.twit.addListener('tweet', function(tweet){
		var dataobj = self.formatData(tweet);
		if (dataobj.prototype !== 'undefined'){
			try{
				console.log('streaming:' + JSON.stringify(dataobj));
                for(var c in self.clients){
				    self.clients[c].send(JSON.stringify({'method':'tweet', 'data': JSON.stringify(dataobj)}));
                }
			}catch(e){
				console.log('web socket error');
			}
		}
	});

	console.log('droidtweetnode start streaming...');
	self.twit.stream();
}

TweetClient.prototype.stopStreaming = function(){
    console.log('stop streaming when no client');
}

TweetClient.prototype.formatData = function(tweet){
	var self = this;
	var lat = 41.5;
	var lgt = -88.3;

	if(tweet.text === 'undefined')
		return {};
	
	//console.log(Object.keys(tweet));
	console.log('formatData:'+tweet.text);
	if(tweet.geo != null){
		console.log('geo:'+tweet.geo.coordinates);
		if(tweet.geo.coordinates != null){
			console.log('geo.coordinates:' + tweet.geo.coordinates);
			lat = tweet.geo.coordinates[0];
			lgt = tweet.geo.coordinates[1];
			console.log('lat:lgt:'+lat+','+lgt);
		}
	}else{
		lat = tweet.user.location;
		lgt = tweet.user.location;
	}

	dataobj={
		'user': tweet.user.name,
		'img' : tweet.user.profile_background_image_url,
		'text': tweet.text,
		'lat' : lat,
		'lgt' : lgt,
	}

	console.log(dataobj);
	return dataobj;
}

exports.TweetClient = TweetClient;

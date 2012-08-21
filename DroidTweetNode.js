require.paths.unshift(
    , __dirname
)

// twitter-node does not modify GLOBAL, that's so rude
var TwitterNode = require('twitter-node').TwitterNode
   ,sys         = require('sys')
   ,net			= require('net')
   ,EventEmitter = require('events').EventEmitter

// Constructor
var DroidTweetNode = module.exports.DroidTweetNode = function(client, keyword) {
	// you can pass args to create() or set them on the TwitterNode instance
	this.twit = new TwitterNode({
		//user: user,
		//password:pass,
		//host: 'wwwgate0.mot.com',
		//port: 1080,
		headers: {'Authorization' : 'Basic bGlmZTBmdW46JEt1bk1pbmcx'}  // my login base64
	   //,locations: [-88.3, 41.5, -87.3, 42.5]		// tweets in Chicago
	});
	this.client = client;
	this.keywords = [];
	this.keywords.push(keyword);
	this.twit.track('superbowl');
	this.twit.track('football');
	this.twit.track('xoom');
	this.twit.track('atrix');

	console.log('DroidTweetNode constructor...tracking:'+keyword);
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
}

// Prototype Inheritance
sys.inherits(DroidTweetNode, EventEmitter)

DroidTweetNode.prototype.addKeyword = function(keyword){
	this.keywords.push(keyword);
	this.twit.track(this.keywords);
}

DroidTweetNode.prototype.addLocation = function(lat1, lng1, lat2, lng2){
	this.twit.location(lat1, lng1, lat2, lng2);
}

DroidTweetNode.prototype.addParams = function(key, value){
	// http://dev.twitter.com/pages/streaming_api
	this.twit.params[key] = value;
}

DroidTweetNode.prototype.startStreaming = function(){
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
				self.client.send(JSON.stringify({'method':'tweet', 'data': JSON.stringify(dataobj)}));
			}catch(e){
				console.log('web socket error');
			}
		}
	});

	console.log('droidtweetnode start streaming...');
	self.twit.stream();
}

DroidTweetNode.prototype.formatData = function(tweet){
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

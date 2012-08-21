var sys = require('sys')
	
module.exports = {
	formatData: function(data) {
		var output = data.toString()
		var header = " disk0       cpu     load average"
		if(output.match(header)){
			sys.log("ignore header")
			return header;
		}else{
			var output_array = output.replace(/^\s+|\s+$/g,"").split(/\s+/);
			for (var i=0; i < output_array.length; i++) {
				output_array[i] = parseFloat(output_array[i]);
				//sys.log(output_array[i]);
			};
			output_data = {
				date: new Date(),
				disk: {
					kbt:output_array[0]
				},
				cpu: {
					sys:output_array[4]
				},
				load: {
					m5:output_array[8]
				}
			}
			return JSON.stringify(output_data)
		}
	}
  , startStreaming : function(client) {
        var fbstat = require('child_process').spawn("/Users/e51141/macsrc/graph/facebook-pysdk/mysrc/fb_graph.py", [], {cwd:'/Users/e51141/macsrc/graph/facebook-pysdk/mysrc'});
		sys.log('streaming to connection :' + client);
        fbstat.on('exit', function(code, signal){
            sys.log('fbstat exit:'+code+' signal:'+signal);
        });
		fbstat.stdout.on('data', function(data) {
			sys.log(typeof data);
			sys.log(data);
			sys.log(formatData(data));
			if(formatData(data) != undefined)
				client.send(formatData(data));
		});
    }
  , periodicalNotify : function(client){
      var cbTimeout = function(socket){
        return function(){
            var fbstat = require('child_process').spawn("/Users/e51141/macsrc/graph/facebook-pysdk/mysrc/fb_graph.py", [], {cwd:'/Users/e51141/macsrc/graph/facebook-pysdk/mysrc'});
            fbstat.on('exit', function(code){
                sys.log('fbstat exit code:'+code);
            });
            
            fbstat.stdout.on('data', function(data){
                sys.log('----socket---:'+socket+'\n');
                sys.log(data);
            });
        }
      }(client);
      var timehandle = setInterval(cbTimeout, 60*1000); // every min.
    }
}

function formatData(data) {
	var output = data.toString()
	var header = " disk0       cpu     load average"
	if(output.match(header)){
		sys.log("ignore header")
		return header;
	}else{
		var output_array = output.replace(/^\s+|\s+$/g,"").split(/\s+/);
		for (var i=0; i < output_array.length; i++) {
			output_array[i] = parseFloat( output_array[i]);
			//sys.log(output_array[i]);
		};
		output_data = {
			date: new Date(),
			disk: {
				kbt:output_array[0]
			},
			cpu: {
				sys:output_array[4]
			},
			load: {
				m5:output_array[8]
			}
		}
		return JSON.stringify(output_data)
	}
}

/*
socket.on('connection', function(client){
	sys.log('connection from:' + client);
	iostat.stdout.on('data', function(data) {
		sys.log(typeof data);
		sys.log(data);
		sys.log(formatData(data));
	});
	client.send(formatData(data));
});
*/


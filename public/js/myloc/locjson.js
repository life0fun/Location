// create a tab reader for file.

URL = 'http://www.google.com/loc/json';
wifi = '00:15:70:91:17:71';

reqjson = {};
reqjson['host'] = 'maps.google.com';
reqjson['version'] = '1.1.0';
reqjson['wifi_towers'] = [];
reqjson['wifi_towers'].push({'mac_address':wifi});

console.log('locjson: reqjson:', reqjson);

var xhr = $.ajax({
            type: 'POST',
            url : URL, // Make sure the provider supports JSONP
            contentType: 'application/json',
            crossDomain: true,
            //data: JSON.stringify(reqjson),
            data: reqjson,
            success: function(data) { console.log('get data:', data);},        
            error: function(){ console.log('post error:')},
            dataType: 'jsonp'
});

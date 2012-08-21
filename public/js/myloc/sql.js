/** There are, naturally, dragons below. **/

function Sqlite3Reader() {
	this.file = null;
	this.pagesize = 0;
	this.tables = [];
	this.table_lookup = {};
	var rootnode = null;
	basereader = this;
	
	this.loadfile = function(reader) {
		var that = this;
        console.log('reader.result:', reader.result);
		return function(e) {
	        that.file = new Parser(reader.result);
	        var magic = that.file.bytes(15);
            console.log('db header magic:', magic);
	        if(("SQLite format 3"!=magic)||(0!=that.file.bytes(1).charCodeAt(0)))
	            throw "location db has bad magic ("+magic+")";
	        
	        that.header();
			pagesize = that.page_size;
			that.rootnode = new Sqlite3BTree(that.file);
			console.log('root node read')
			MASTER = new Sqlite3Table(that.rootnode, true);
			console.log('sqlite_master loaded')
			
			that.tables = [];
			$.each(MASTER.rows(), function(i, schema) {
                console.log('master_row:', i, schema.columns[0]);
				var r = {
					type: read_column(schema.columns[0], schema.payload), 
					name: read_column(schema.columns[1], schema.payload), 
					tbl_name: read_column(schema.columns[2], schema.payload), 
					rootpage: read_column(schema.columns[3], schema.payload), 
					sql: read_column(schema.columns[4], schema.payload)
				}
				if(r['type']=='table') {
					that.tables.push(r);
					that.table_lookup[r.name] = r;
                    console.log('master found table:', r.name);
				}
			});

			$(document).trigger('sqlready');
	    }
	}
	
	this.read_table = function(table_name) { 
		var table = SQR.table_lookup[table_name];
		var root = table['rootpage'];
		this.file.seek(0);
		
		this.file.seek(page_size * (root-1))
		oldpos = this.file.pos();
		var node = new Sqlite3BTree(this.file);
		this.file.seek(oldpos);
		
		tbl = new Sqlite3Table(node);
		var data = [];
		$.map(tbl.rows(), function(r) {
			row = $.map(r.columns, function(col) { return read_column(col, r.payload) })
			////console.log('new row')
            console.log('onerow:',row)
			data.push(row)
			return row
		});
		return data
	}
	
	this.header = function() {
		// we only care about the page_size for this right now.
		page_size = this.page_size = this.file.get_int(2); // global whatuuupppp
        console.log('page size: ' + this.page_size);
		this.file.seek(100);
	};
	
	function Sqlite3Table(_node, root) {
		var node = _node;
		var isRoot = root;
		var passthrough = null;
        console.log(node.header);
		if(node.header['type']==5) {
			passthrough = new Sqlite3ITable(_node, root)
		}else{
			passthrough = new Sqlite3LTable(_node, root)
		}
		
		this.rows = function() { 
			return passthrough.rows();
		}
	}
	
	function Sqlite3ITable(_node, root) {
		console.log("starting inner table");
		that = this;
		var isRoot = root;
		var node = _node;
		this.file = _node.file;
		this.pos = this.file.pos();
		var header = node.header;
		var cells = node.cells;
		
		this.read_children = function() {
			var kids = [];
			var pages = [];
			//console.log('VV header VV')
			//console.log(cells)
			if(header['rightmost'] != null) {  pages.push(header['rightmost']) } 
			$.each(cells, function(i, value) {

				if(isRoot) { that.file.seek(value) }else{ that.file.seek(value + that.pos) }
				//console.log('cell ' + value + ' @ ' + that.file.pos() + ' // ' + that.pos);
				var page_number = that.file.get_int(4) - 1;
				//console.log('page found: ' + page_number)
				int_key = that.file.varint(); // need to impliment varint asap;
				//console.log('key number: ' + int_key)
				pages.push(page_number)
				//console.log(pages)
				//lilog('^^ points to page ' + page_number);
				that.file.seek(that.pos)
			});
			
			$.each(pages.sort().reverse(), function(i, page) {
				that.file.seek(page_size * page);
				//lilog('reading child tree @ ' + that.file.pos() + '// page: ' + page)
				var tree = new Sqlite3BTree(that.file);
				that.file.seek(page_size * page);
				var table = new Sqlite3LTable(tree)
				kids.push(table)
			});
			return kids;
			
		}
		
		this.rows = function() {
			_r = []
			$.each(children, function(i, kid) {
				$.each(kid.rows(), function(i, x) { count = count + 1; _r.push(x) });
			});
			return _r;
			
		}
		
		var children = this.read_children();	
	}
	
	function Sqlite3LTable(_node, root) {
		console.log("starting leaf table");
		var that = this;
		that.isRoot = root;
		var node = _node;
		this.file = _node.file;
		this.pos = that.file.pos();
		this.header = node.header;
		var cells = _node.cells.sort();
		
		this.rows = function() {
			
			var _internal = []
			$.each(cells, function(i, value) {
				if(that.root) { that.file.seek(value) }else{ that.file.seek(value + that.pos) }
				record = new Sqlite3Record(that.file);
				_internal.push(record)
			})
			return _internal;
		}

	}
	
	function Sqlite3Record(file) {
		var payload_length = file.varint();
		var rowid = file.varint();
		var oldpos = file.pos();
		var header_length = file.varint();
		file.seek(oldpos);
		
		var header = file.bytes(header_length);
		var payload = new Parser(header);
		
		var header_length = payload.varint(); //shutup
		this.columns = [];
		while(payload.more()) {
			this.columns.push(payload.varint());
		}
		//this.columns = this.columns.reverse();
		this.payload = new Parser(file.bytes(payload_length - header_length));
		//console.log('length: ' + this.payload.length)
	}


	
	function Sqlite3BTree(_file) {
        console.log('BTree File:', _file);
		this.file = _file;
        // The first byte of the page-header, the "flags" field, is set to 0x05 for internal tree node pages, and 0x0D for leaf pages.
		var types = {'2': 'IIndex', '5': 'ITable', '10': 'LIndex', '13': 'LTable'};
		this.startpos = this.file.pos();
		
		this.parse_header = function() {
			//console.log('parsing btree at ' + this.file.pos())
			
			type = this.file.get_int(1);
			ffree = this.file.get_int(2);
			cells = this.file.get_int(2);
			content = this.file.get_int(2);
			this.file.skip(1); 
			rightmost = null;
			if(type==5) {
				rightmost = this.file.get_int(4) - 1;
			}
			return {rightmost: rightmost, type: type, cells: cells, content: content, string_type: types[type]}
		}
		
		
		this.parse_cells = function() {
			cells = [];
			for(i = 0; i < this.header['cells']; i++) {
				cells.push(this.file.get_int(2));
			}
			return cells;
		}
		
		this.header = this.parse_header();
		this.cells = this.parse_cells();
	}
}

describe("Ti.Database sync database tests",{
	
	before_all:function()
	{
		var datadir = Titanium.Filesystem.getApplicationDataDirectory();

		//
		// delete any existing files we may have created related to DB
		// so we can ensure that the code below is running fresh on this app
		//
		var listing = Titanium.Filesystem.getFile(datadir).getDirectoryListing();
		for (var c=0;c<listing.length;c++)
		{
			var f = listing[c];
			if (f.isFile() && f.name()!='application.properties')
			{
				f.deleteFile();
			}
			else if (f.isDirectory())
			{
				f.deleteDirectory(true);
			}
		}
	},
	
	check_types:function()
	{
		value_of(Titanium.Database).should_be_object();
		value_of(Titanium.Database.open).should_be_function();
	},
	
	before: function()
	{
		this.db = Titanium.Database.open("test_db");
	},
	
	after: function()
	{
		this.db.close();
	},
	
	after_all: function()
	{
		var db = Titanium.Database.open("test_db");
		db.remove();
	},
	
	db_basic_object_properties: function()
	{
		value_of(this.db).should_not_be_null();
		
		var methods = ['execute','close','remove'];
		
		for (var c=0;c<methods.length;c++)
		{
			var method = methods[c];
			value_of(this.db[method]).should_be_function();
		}
		
		var properties = ['rowsAffected'];
		for (var c=0;c<properties.length;c++)
		{
			var property = properties[c];
			value_of(this.db[property]).should_be_number();
		}
	},
	
	basic_query_tests:function()
	{
		var rs = this.db.execute("CREATE TABLE TEST (name TEXT)");
		value_of(rs).should_be_object();
		
		var methods = ['isValidRow','fieldCount','fieldName','field','close'];
		for (var c=0;c<methods.length;c++)
		{
			var method = methods[c];
			value_of(rs[method]).should_be_function();
		}
		
		value_of(rs.isValidRow()).should_be_false();
		value_of(rs.fieldCount()).should_be_zero();
		value_of(rs.fieldName(0)).should_be_null();
		value_of(rs.field(0)).should_be_null();
		
		rs.close();

		// table should exist, tests IF NOT EXISTS
		rs = this.db.execute("CREATE TABLE IF NOT EXISTS TEST (name TEXT)");
		value_of(rs).should_be_object();
		rs.close();

		// test to make sure rows are empty
		rs = this.db.execute("select count(*) from TEST");
		value_of(rs).should_be_object();
		value_of(rs.next()).should_be_undefined();
		value_of(rs.field(0)).should_be(0);
		rs.close();

		// basic insert
		this.db.execute("insert into TEST values('a')");
		rs = this.db.execute("select * from TEST");
		value_of(rs).should_be_object();
		value_of(rs.isValidRow()).should_be_true();
		value_of(rs.next()).should_be_undefined();
		value_of(rs.isValidRow()).should_be_false();
		value_of(rs.field(0)).should_be('a');
		value_of(rs.fieldName(0)).should_be('name');
		value_of(rs.fieldByName('name')).should_be('a');
		value_of(rs.fieldCount()).should_be(1);
		rs.close();

		// drop table
		this.db.execute("DROP TABLE TEST");

		var ok = false;
		try
		{
			this.db.execute("select * from TEST");
		}
		catch(e)
		{
			// this is good
			ok = true;
		}
		if (!ok)
		{
			throw "returned result after drop table but should have thrown exception";
		}
		
		// multi-column
		rs = this.db.execute("CREATE TABLE TEST (name TEXT, size INT)");
		value_of(rs).should_be_object();
		rs.close();
		
		
		this.db.execute("insert into TEST values('b',123)");
		rs = this.db.execute("select name as n, size as s from TEST");
		value_of(rs).should_be_object();
		value_of(rs.fieldCount()).should_be(2);
		value_of(rs.rowCount()).should_be(1);
		rs.next();
		value_of(rs.field(0)).should_be('b');
		value_of(rs.field(1)).should_be(123);
		value_of(rs.field(1)).should_be_number();
		value_of(rs.fieldByName('n')).should_be('b');
		rs.close();
		
		// insert more values
		this.db.execute("insert into TEST values('c',567)");
		rs = this.db.execute("select count(*), sum(size) from TEST");
		value_of(rs).should_be_object();
		rs.next();
		value_of(rs.rowCount()).should_be(1);
		value_of(rs.field(0)).should_be(2);
		value_of(rs.field(1)).should_be(690);
		rs.close();

		// check the new values
		rs = this.db.execute("select * from TEST");
		var count=0;
		while(rs.isValidRow())
		{
			count++;
			rs.next();
		}
		value_of(count).should_be(2);
		value_of(this.db.rowsAffected).should_be(2);
		rs.close();

		// parameter selects
		rs = this.db.execute("select * from TEST where name = ?",['c']);
		value_of(rs).should_be_object();
		value_of(this.db.rowsAffected).should_be(1);
		value_of(rs.fieldCount()).should_be(2);
		value_of(rs.field(0)).should_be('c');
		value_of(rs.field(1)).should_be(567);
		rs.close();
		
		// single parameter arg
		rs = this.db.execute("select * from TEST where name = ?",'c');
		value_of(rs).should_be_object();
		value_of(this.db.rowsAffected).should_be(1);
		value_of(rs.fieldCount()).should_be(2);
		value_of(rs.field(0)).should_be('c');
		value_of(rs.field(1)).should_be(567);
		rs.close();
		
		// multiple varargs select
		rs = this.db.execute("select * from TEST where name = ? and size > ?",'c',1);
		value_of(rs).should_be_object();
		value_of(this.db.rowsAffected).should_be(1);
		value_of(rs.fieldCount()).should_be(2);
		value_of(rs.field(0)).should_be('c');
		value_of(rs.field(1)).should_be(567);
		rs.close();
		
		// multiple args in array for select
		rs = this.db.execute("select * from TEST where name = ? and size = ?",['c',567]);
		value_of(rs).should_be_object();
		value_of(this.db.rowsAffected).should_be(1);
		value_of(rs.fieldCount()).should_be(2);
		value_of(rs.field(0)).should_be('c');
		value_of(rs.field(1)).should_be(567);
		rs.close();
		
		// multiple array insert
		this.db.execute("insert into TEST values (?,?)",['d',890]);
		rs = this.db.execute("select * from TEST where name = ? and size = ?",['d',890]);
		value_of(rs).should_be_object();
		value_of(this.db.rowsAffected).should_be(1);
		value_of(rs.fieldCount()).should_be(2);
		value_of(rs.field(0)).should_be('d');
		value_of(rs.field(1)).should_be(890);
		rs.close();

		// multiple varargs insert
		this.db.execute("insert into TEST values (?,?)",'e',891);
		
		// pull out using varargs
		rs = this.db.execute("select * from TEST where name = :name and size = :size",['e',891]);
		value_of(rs).should_be_object();
		value_of(this.db.rowsAffected).should_be(1);
		value_of(rs.fieldCount()).should_be(2);
		value_of(rs.field(0)).should_be('e');
		value_of(rs.field(1)).should_be(891);
		rs.close();
		
		// delete the DB
		this.db.execute("delete from TEST");
		
		// check to make sure it's deleted
		rs = this.db.execute("select count(*) from TEST");
		value_of(rs).should_be_object();
		value_of(rs.field(0)).should_be(0);
		rs.close();
		
	}

});	

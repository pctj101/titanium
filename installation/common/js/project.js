
if (typeof(Titanium)=='undefined') Titanium = {};

var TFS = Titanium.Filesystem;

Titanium.Project = 
{
	requiredModulesList: ['api','tiapp','tifilesystem','tiplatform','tiui','javascript','tianalytics'],
	requiredModules:[],
	optionalModules:[],
	runtimeDir:null,
	runtimeVersion:null,
	getModuleVersion: function(versions)
	{
		var latestVer = 0
		for (var i=0;i<versions.length;i++)
		{
			var ver = parseFloat(versions[i]);
			if (ver > latestVer)
			{
				latestVer = ver;
			}
		}
		return ver;
	},
	setModules: function(dir)
	{
		var result = this.getModulesAndRuntime(dir);
		
		// set runtime DIR and VERSION
		this.runtimeDir = result.runtime.dir;
		this.runtimeVersion = String(this.getModuleVersion(result.runtime.versions));
		
		this.requiredModules = [];
		this.optionalModules = [];
		
		// set optional and required modules
		for (var c=0;c<result.modules.length;c++)
		{
			var name = result.modules[c].name;
			if (this.requiredModulesList.indexOf(name) == -1)
			{
				this.optionalModules.push({
					name:name,
					version:this.getModuleVersion(result.modules[c].versions),
					dir:result.modules[c].dir
				});
			}
			else
			{
				this.requiredModules.push({
					name:name,
					version:this.getModuleVersion(result.modules[c].versions),
					dir:result.modules[c].dir
				});
			}
		}
		
	},
	writeManifest: function(project,excludedModules)
	{
		this.setModules(project.dir);

		var resources = TFS.getFile(project.dir,'Resources');

		// build the manifest
		var manifest = '#appname:'+project.name+'\n';
		manifest+='#appid:'+project.appid+'\n';
		manifest+='#publisher:'+project.publisher+'\n';

		if (project.image)
		{
			// look for image in two places - either full path or in resources dir
			var image = TFS.getFile(project.image);
			if (!image.exists())
			{
				image = TFS.getFile(resources,project.image);
			}
			// use default if not exists
			if (!image.exists())
			{
				var path = Titanium.App.appURLToPath('app://images');
				image = TFS.getFile(path,'default_app_logo.png')
			}
			
			var image_dest = TFS.getFile(resources,image.name());
			if (image.toString() != image_dest.toString())
			{
				image.copy(image_dest);
			}
			imageName = image.name();
			manifest+='#image:'+image.name()+'\n';
		}

		manifest+='#url:'+project.url+'\n';
		manifest+='#guid:'+project.guid+'\n';
		manifest+='#desc:'+project.description+'\n';
		manifest+='runtime:'+this.runtimeVersion+'\n';

		// write out required modules
		for (var i=0;i<this.requiredModules.length;i++)
		{
			manifest+= this.requiredModules[i].name +':'+ this.requiredModules[i].version+'\n';
		}
		// write out optional modules
		for (var c=0;c<this.optionalModules.length;c++)
		{
			if (excludedModules)
			{
				if (!excludedModules[this.optionalModules[c].name])
				{
					manifest+=this.optionalModules[c].name+':'+this.optionalModules[c].version+'\n';
				}
			}
			else
			{
				manifest+=this.optionalModules[c].name+':'+this.optionalModules[c].version+'\n';
			}
		}

		var mf = TFS.getFile(project.dir,'manifest');
		mf.write(manifest);
		return manifest;
		
	},
	launch: function(project,install,callback,args)
	{
		try
		{
			// write out new manifest based on current modules
			var manifest = this.writeManifest(project);

			// create dist dir
			var dist = TFS.getFile(project.dir,'dist',Titanium.platform);
			dist.createDirectory(true);

			// create appp
			var runtime = TFS.getFile(this.runtimeDir,this.runtimeVersion);
			var app = Titanium.createApp(runtime,dist,project.name,project.appid,install);
			
			// write out new manifest
			var app_manifest = TFS.getFile(app.base,'manifest');
			app_manifest.write(manifest);
			
			// write out tiapp.xml
			var resources = TFS.getFile(project.dir,'Resources');
			var tiapp = TFS.getFile(project.dir,'tiapp.xml');
			tiapp.copy(app.base);
			TFS.asyncCopy(resources,app.resources,function()
			{
				// no modules to bundle, install the net installer
				var net_installer_src = TFS.getFile(runtime,'installer');
				var net_installer_dest = TFS.getFile(app.base,'installer');
				TFS.asyncCopy(net_installer_src,net_installer_dest,function(filename,c,total)
				{
					var appModules = TFS.getFile(project.dir,"modules");
					if (appModules.exists())
					{
						var moduleDest = TFS.getFile(app.base,"modules");
						TFS.asyncCopy(appModules,moduleDest, function()
						{
							Titanium.Process.setEnv('KR_DEBUG','true');
							var x =  Titanium.Process.launch(app.executable.nativePath(),args);
							if (x && callback)
							{
								callback(x);
							}
						});
					}
					else
					{
						Titanium.Process.setEnv('KR_DEBUG','true');
						var x = Titanium.Process.launch(app.executable.nativePath(),args);
						if (x && callback)
						{
							callback(x);
						}
					}
				});
			});
		}
		catch(e)
		{
			alert('Error launching app ' + e);
		}
		
	},
	getVersions:function(dir)
	{
		var entry = {name:dir.name(), versions:[], dir:dir};
		var versions = dir.getDirectoryListing();
		if (!versions)return null;
		for (var v=0;v<versions.length;v++)
		{
			if (TFS.getFile(dir,versions[v].name()).isDirectory()==true)
				entry.versions.push(versions[v].name());
		}
		return entry;
	},
	getModulesAndRuntime:function(appDir)
	{
		os = Titanium.platform ;
		// get core runtime modules
		var dir = Titanium.Process.getEnv('KR_RUNTIME_HOME');
		var modules = TFS.getFile(dir,'modules',os);
		var dirs = modules.getDirectoryListing();
		var result = [];
		for (var c=0;c<dirs.length;c++)
		{
			if (this.getVersions(dirs[c]) == null)
				continue;
			
			result.push(this.getVersions(dirs[c]));
		}
		
		// get app modules
		var appModules = TFS.getFile(appDir,'modules');
		if (appModules.exists())
		{
			var appDirs = appModules.getDirectoryListing();
			for (var c=0;c<appDirs.length;c++)
			{
				if (TFS.getFile(appDirs[c]).isDirectory()==true)
				{
					var entry = {name:appDirs[c].name(), versions:['0.1'], dir:appDirs[c]};
					result.push(entry);
				}
			}
		}
		var runtime = TFS.getFile(dir,'runtime',os);
		return {
			modules: result,
			runtime: this.getVersions(runtime),
			runtime_basedir: runtime,
			modules_basedir: modules
		};
	},
	parseEntry:function(entry)
	{
		if (entry[0]==' ' || entry.length==0) return null;
		var i = entry.indexOf(':');
		if (i < 0) return null;
		var key = jQuery.trim(entry.substring(0,i));
		var value = jQuery.trim(entry.substring(i+1));
		var token = false;
		if (key.charAt(0)=='#')
		{
			token = true;
			key = key.substring(1);
		}
		return {
			key: key,
			value: value,
			token: token
		};
	},
	addEntry:function(line,result)
	{
		if (line)
		{
			var entry = Titanium.Project.parseEntry(line);
			if (!entry) return;
			if (entry.token) 
				result.properties[entry.key]=entry.value;
			else
				result.map[entry.key]=entry.value;
		}
	},
	getManifest:function(mf)
	{
		var manifest = TFS.getFile(mf);
		if (!manifest.isFile())
		{
			return {
				success:false,
				message:"Couldn't find manifest!"
			};
		}
		var result = {
			success:true,
			file:manifest,
			map:{},
			properties:{}
		};
		var line = manifest.readLine(true);
		Titanium.Project.addEntry(line,result);
		while (true)
		{
			line = manifest.readLine();
			if(!line) break;
			Titanium.Project.addEntry(line,result);
		}
		return result;
	},
	writeTiXML: function(id,name,publisher,url,outdir)
	{
		var year = new Date().getFullYear();
		var tiappxml = this.XML_PROLOG;
		tiappxml+=this.makeEntry('id',id);
		tiappxml+=this.makeEntry('name',name);
		tiappxml+=this.makeEntry('version','1.0');
		tiappxml+=this.makeEntry('publisher',publisher);
		tiappxml+=this.makeEntry('url',url);
		tiappxml+=this.makeEntry('copyright',year+' by '+publisher);
		tiappxml+="<window>\n";
		tiappxml+=this.makeEntry('id','initial');
		tiappxml+=this.makeEntry('title',name);
		tiappxml+=this.makeEntry('url','app://index.html');
		tiappxml+=this.makeEntry('width','700');
		tiappxml+=this.makeEntry('max-width','3000');
		tiappxml+=this.makeEntry('min-width','0');
		tiappxml+=this.makeEntry('height','800');
		tiappxml+=this.makeEntry('max-height','3000');
		tiappxml+=this.makeEntry('min-height','0');
		tiappxml+=this.makeEntry('fullscreen','false');
		tiappxml+=this.makeEntry('resizable','true');
		tiappxml+=this.makeEntry('chrome','true',{'scrollbars':'true'});
		tiappxml+=this.makeEntry('maximizable','true');
		tiappxml+=this.makeEntry('minimizable','true');
		tiappxml+=this.makeEntry('closeable','true');
		tiappxml+=this.makeEntry('visible','true');
		tiappxml+="</window>\n";
		tiappxml+=this.XML_EPILOG;
		var ti = TFS.getFile(outdir,'tiapp.xml');
		ti.write(tiappxml);
		return ti;
	},
	create:function(name,guid,desc,dir,publisher,url,image,jsLibs, html)
	{
		var outdir = TFS.getFile(dir,name);
		if (outdir.isDirectory())
		{
			return {
				success:false,
				message:"Directory already exists: " + outdir
			}
		}
		outdir.createDirectory(true);
		var normalized_name = name.replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
		normalized_name = normalized_name.replace(/ /g,'_').toLowerCase();
		var normalized_publisher = publisher.replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
		normalized_publisher = normalized_publisher.replace(/ /g,'_').toLowerCase();
		// write out the TIAPP.xml
		var id = 'com.'+normalized_publisher+'.'+normalized_name;
		var ti = Titanium.Project.writeTiXML(id,name,publisher,url,outdir);
		var resources = TFS.getFile(outdir,'Resources');
		resources.createDirectory();
		var index = TFS.getFile(resources,'index.html');
		
		var jquery = '<script type="text/javascript" src="jquery-1.3.2.js"></script>\n';
		var entourage = '<script type="text/javascript" src="entourage-jquery-3.0.js"></script>\n';
		var prototype_js = '<script type="text/javascript" src="prototype-1.6.0.js"></script>\n';
		var scriptaculous = '<script type="text/javascript" src="scriptaculous-1.8.2.js"></script>\n';
		var mootools = '<script type="text/javascript" src="mootools-1.2.1.js"></script>\n';
		var yahoo = '<script type="text/javascript" src="yui-2.6.0.js"></script>\n';
		var swfobject = '<script type="text/javascript" src="swfobject-1.5.js"></script>\n';
		var dojo = '<script type="text/javascript" src="dojo-1.2.3.js"></script>\n';

		var head = '';
		
		if (html)
		{
			head+='<head>\n';		
		}
		else
		{
			head+='<head><style>body{background-color:#292929;color:white}</style>\n';
		}
		
		var path = Titanium.App.appURLToPath('app://thirdparty_js');
		if (jsLibs)
		{
			if (jsLibs.jquery)
			{
				head += jquery
				var f = TFS.getFile(path,'jquery-1.3.2.js');
				f.copy(resources);
			}
			if (jsLibs.entourage)
			{
				head += entourage;
				var f = TFS.getFile(path,'entourage','entourage-jquery-3.0.js');
				f.copy(resources);
				var f2 = TFS.getFile(path,'entourage','entourage-ui');
				f2.copy(resources);
			}
			if (jsLibs.prototype_js)
			{
				head+= prototype_js;
				var f = TFS.getFile(path,'prototype-1.6.0.js');
				f.copy(resources);
			}
			if (jsLibs.scriptaculous)
			{
				head+=scriptaculous;
				var f = TFS.getFile(path,'scriptaculous-1.8.2.js');
				f.copy(resources);
			}
			if (jsLibs.mootools)
			{
				head+=mootools;
				var f = TFS.getFile(path,'mootools-1.2.1.js');
				f.copy(resources);
			}
			if(jsLibs.dojo)
			{
				head+=dojo;
				var f = TFS.getFile(path,'dojo-1.2.3.js');
				f.copy(resources);
			}
			if (jsLibs.swf)
			{
				head+=swfobject;
				var f = TFS.getFile(path,'swfobject-1.5.js');
				f.copy(resources);
			}
			if (jsLibs.yahoo)
			{
				head+=yahoo;
				var f = TFS.getFile(path,'yui-2.6.0.js');
				f.copy(resources);
			}
			
		}
		head += '</head>';
		
		if (html)
		{
			index.write('<html>\n'+head+'\n<body>\n' + html + '\n</body>\n</html>')
		}
		else
		{
			index.write('<html>\n'+head+'\n<body>\nWelcome to Titanium\n</body>\n</html>');
		}
		
		var manifest = "#appname: "+name+"\n" +
		"#publisher: "+publisher+"\n"+
		"#url: "+url+"\n"+
		"#image: "+image+"\n"+
		"#appid: "+id+"\n"+
		"#desc: "+desc+"\n"+
		"#guid: " +  guid + "\n";
		
		var mf = TFS.getFile(outdir,'manifest');
		mf.write(manifest);
		
		var gi = TFS.getFile(outdir,'.gitignore');
		gi.write('dist\ntmp\n');
		
		var dist = TFS.getFile(outdir,'dist');
		dist.createDirectory();
		
		return {
			basedir: outdir,
			resources: resources,
			id: id,
			name: name,
			success:true
		};
	},
	makeEntry:function(key,value,attrs)
	{
		var str = '<' + key;
		if (attrs)
		{
			str+=' ';
			var values = [];
			for (name in attrs)
			{
				var v = attrs[name];
				if (v)
				{
					values.push(name + '=' + '"' + v + '"');
				}
			}
			str+=values.join(' ');
		}
		str+='>' + value + '</'+key+'>\n';
		return str;
	},
	
	updateManifest: function(values,addGuid)
	{
		var manifest = TFS.getFile(values.dir,"manifest");
		var normalized_name = name.replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
		normalized_name = normalized_name.replace(/ /g,'_').toLowerCase();
		var normalized_publisher = publisher.replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
		normalized_publisher = normalized_publisher.replace(/ /g,'_').toLowerCase();
		var id = 'com.'+normalized_publisher+'.'+normalized_name;
		var newManifest = ''

		// add guid if not exists
		if (addGuid ==true)
		{
			newManifest = '#guid:'+values.guid+"\n";
		}

		var line = manifest.readLine(true);
		var entry = Titanium.Project.parseEntry(line);
		for (var i=0;i<1000;i++)
		{
			if (entry == null)
			{
				line = manifest.readLine();
				if (!line || line == null)break;
				entry = Titanium.Project.parseEntry(line);
			}
			if (entry.key.indexOf('appname') != -1)
			{
				newManifest += '#appname:'+values.name+"\n";
			}
			else if (entry.key.indexOf('publisher') != -1)
			{
				newManifest += '#publisher:'+values.publisher+"\n";
			}
			else if (entry.key.indexOf('url') != -1)
			{
				newManifest += '#url:'+values.url+"\n";
			}
			else if (entry.key.indexOf('image') != -1)
			{
				newManifest += '#image:'+values.image+"\n";
			}
			else if (entry.key.indexOf('appid') != -1)
			{
				newManifest += '#appid:'+id+"\n";
			}
			else if (entry.key.indexOf('guid') != -1)
			{
				newManifest += '#guid:'+values.guid+"\n";
			}
			else if (entry.key.indexOf('description') != -1)
			{
				newManifest += '#desc:'+values.description+"\n";
			}

			else
			{
				newManifest += entry.key + ":"  + entry.value + "\n";
			}
			entry = null;
		}
		manifest.write(newManifest);
   }
};

// // by default, add our current modules
// (function()
// {
// 	var tok = Titanium.platform=='win32' ? ';' : ':';
// 	var modules = Titanium.Process.getEnv('KR_MODULES').split(tok);
// 	for (var c=0;c<modules.length;c++)
// 	{
// 		var m = modules[c];
// 		if (m)
// 		{
// 			var f = Titanium.Filesystem.getFile(m);
// 			alert("name="+m+",f="+f);
// 			var name = f.getName();
// 			Titanium.Project.optionalModules.push(name);
// 		}
// 	}
// })();

Titanium.Project.XML_PROLOG = "<?xml version='1.0' encoding='UTF-8'?>\n" +
	"<ti:app xmlns:ti='http://ti.appcelerator.org'>\n";
	
Titanium.Project.XML_EPILOG = "</ti:app>";
	

/*
  +----------------------------------------------------------------------+
  | PHP Version 5                                                        |
  +----------------------------------------------------------------------+
  | Copyright (c) 1997-2004 The PHP Group                                |
  +----------------------------------------------------------------------+
  | This source file is subject to version 3.0 of the PHP license,       |
  | that is bundled with this package in the file LICENSE, and is        |
  | available through the world-wide-web at the following url:           |
  | http://www.php.net/license/3_0.txt.                                  |
  | If you did not receive a copy of the PHP license and are unable to   |
  | obtain it through the world-wide-web, please send a note to          |
  | license@php.net so we can mail you a copy immediately.               |
  +----------------------------------------------------------------------+
  | Author: Wez Furlong <wez@thebrainroom.com>                           |
  +----------------------------------------------------------------------+
*/

/* $Id: buildconf.js,v 1.12 2004-08-03 01:23:35 wez Exp $ */
// This generates a configure script for win32 build

WScript.StdOut.WriteLine("Rebuilding configure.js");
var FSO = WScript.CreateObject("Scripting.FileSystemObject");
var C = FSO.CreateTextFile("configure.js", true);

var modules = "";
var MODULES = WScript.CreateObject("Scripting.Dictionary");

function file_get_contents(filename)
{
	var F = FSO.OpenTextFile(filename, 1);
	var t = F.ReadAll();
	F.Close();
	return t;
}

function Module_Item(module_name, config_path, dir_line, deps, content)
{
	this.module_name = module_name;
	this.config_path = config_path;
	this.dir_line = dir_line;
	this.deps = deps;
	this.content = content;
}

function find_config_w32(dirname)
{
	if (!FSO.FolderExists(dirname)) {
		return;
	}

	var f = FSO.GetFolder(dirname);
	var	fc = new Enumerator(f.SubFolders);
	var c, i, ok, n;
	var item = null;
	var re_dep_line = new RegExp("ADD_EXTENSION_DEP\\([^,]*\\s*,\\s*['\"]([^'\"]+)['\"].*\\);", "gm");
	
	for (; !fc.atEnd(); fc.moveNext())
	{
		ok = true;
		/* check if we already picked up a module with the same dirname;
		 * if we have, don't include it here */
		n = FSO.GetFileName(fc.item());
		
		if (n == 'CVS' || n == 'tests')
			continue;
			
	//	WScript.StdOut.WriteLine("checking " + dirname + "/" + n);
		if (MODULES.Exists(n)) {
			WScript.StdOut.WriteLine("Skipping " + dirname + "/" + n + " -- already have a module with that name");
			continue;
		}

			
		c = FSO.BuildPath(fc.item(), "config.w32");
		if (FSO.FileExists(c)) {
//			WScript.StdOut.WriteLine(c);

			var dir_line = "configure_module_dirname = condense_path(FSO.GetParentFolderName('"
							   	+ c.replace(new RegExp('(["\\\\])', "g"), '\\$1') + "'));\r\n";
			var contents = file_get_contents(c);
			var deps = new Array();

			// parse out any deps from the file
			var calls = contents.match(re_dep_line);
			if (calls != null) {
				for (i = 0; i < calls.length; i++) {
					// now we need the extension name out of this thing
					if (calls[i].match(re_dep_line)) {
//						WScript.StdOut.WriteLine("n depends on " + RegExp.$1);
						deps[deps.length] = RegExp.$1;
					}
				}
			}

			item = new Module_Item(n, c, dir_line, deps, contents);
			MODULES.Add(n, item);
		}
	}
}

// Emit core modules array.  This is used by a snapshot
// build to override a default "yes" value so that external
// modules don't break the build by becoming statically compiled
function emit_core_module_list()
{
	var module_names = (new VBArray(MODULES.Keys())).toArray();
	var i, mod_name, j;
	var item;
	var output = "";

	C.WriteLine("core_module_list = new Array(");

	// first, look for modules with empty deps; emit those first
	for (i in module_names) {
		mod_name = module_names[i];
		C.WriteLine("\"" + mod_name.replace(/_/g, "-") + "\",");
	}

	C.WriteLine("false // dummy");

	C.WriteLine(");");
}


function emit_module(item)
{
	return item.dir_line + item.content;
}

function emit_dep_modules(module_names)
{
	var i, mod_name, j;
	var output = "";
	var item = null;

	for (i in module_names) {
		mod_name = module_names[i];

		if (MODULES.Exists(mod_name)) {
			item = MODULES.Item(mod_name);
			MODULES.Remove(mod_name);
			if (item.deps.length) {
				output += emit_dep_modules(item.deps);
			}
			output += emit_module(item);
		}
	}

	return output;
}

function gen_modules()
{
	var module_names = (new VBArray(MODULES.Keys())).toArray();
	var i, mod_name, j;
	var item;
	var output = "";

	// first, look for modules with empty deps; emit those first
	for (i in module_names) {
		mod_name = module_names[i];
		item = MODULES.Item(mod_name);
		if (item.deps.length == 0) {
			MODULES.Remove(mod_name);
			output += emit_module(item);
		}
	}

	// now we are left with modules that have dependencies on other modules
	module_names = (new VBArray(MODULES.Keys())).toArray();
	output += emit_dep_modules(module_names);

	return output;
}

if (FSO.FileExists("ZendEngine2\\OBJECTS2_HOWTO")) {
	if (FSO.FolderExists("Zend")) {
		FSO.MoveFolder("Zend", "ZendEngine1");
	}
	FSO.MoveFolder("ZendEngine2", "Zend");
}

// Write the head of the configure script
C.WriteLine("/* This file automatically generated from win32/build/confutils.js */");
C.Write(file_get_contents("win32/build/confutils.js"));

// Pull in code from sapi and extensions
modules = file_get_contents("win32/build/config.w32");

// Pick up confs from TSRM and Zend if present
find_config_w32(".");
find_config_w32("sapi");
find_config_w32("ext");
emit_core_module_list();

find_config_w32("pecl");
find_config_w32("..\\pecl");
find_config_w32("pecl\\rpc");
find_config_w32("..\\pecl\\rpc");


// Now generate contents of module based on MODULES, chasing dependencies
// to ensure that dependent modules are emitted first
modules += gen_modules();

// Look for ARG_ENABLE or ARG_WITH calls
re = new RegExp("(ARG_(ENABLE|WITH)\([^;]+\);)", "gm");
calls = modules.match(re);
for (i = 0; i < calls.length; i++) {
	item = calls[i];
	C.WriteLine("try {");
	C.WriteLine(item);
	C.WriteLine("} catch (e) {");
	C.WriteLine('\tSTDOUT.WriteLine("problem: " + e);');
	C.WriteLine("}");
}

C.WriteBlankLines(1);
C.WriteLine("conf_process_args();");
C.WriteBlankLines(1);

// Comment out the calls from their original positions
modules = modules.replace(re, "/* $1 */");
C.Write(modules);

C.WriteBlankLines(1);
C.Write(file_get_contents("win32/build/configure.tail"));

WScript.StdOut.WriteLine("Now run 'cscript /nologo configure.js --help'");


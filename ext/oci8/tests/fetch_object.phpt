--TEST--
oci_fetch_object()
--SKIPIF--
<?php if (!extension_loaded('oci8')) die("skip no oci8 extension"); ?>
--ENV--
return "
ORACLE_HOME=".(isset($_ENV['ORACLE_HOME']) ? $_ENV['ORACLE_HOME'] : '')."
NLS_LANG=".(isset($_ENV['NLS_LANG']) ? $_ENV['NLS_LANG'] : '')."
";
--FILE--
<?php

require dirname(__FILE__)."/connect.inc";
require dirname(__FILE__).'/create_table.inc';

$insert_sql = "INSERT INTO ".$schema."".$table_name." (id, value) VALUES (1,1)";

if (!($s = oci_parse($c, $insert_sql))) {
	die("oci_parse(insert) failed!\n");
}

for ($i = 0; $i<3; $i++) {
	if (!oci_execute($s)) {
		die("oci_execute(insert) failed!\n");
	}
}

if (!oci_commit($c)) {
	die("oci_commit() failed!\n");
}

$select_sql = "SELECT * FROM ".$schema."".$table_name."";

if (!($s = oci_parse($c, $select_sql))) {
	die("oci_parse(select) failed!\n");
}

if (!oci_execute($s)) {
	die("oci_execute(select) failed!\n");
}
while ($row = oci_fetch_object($s)) {
	var_dump($row);
}

require dirname(__FILE__).'/drop_table.inc';

echo "Done\n";

?>
--EXPECT--
object(stdClass)#1 (2) {
  ["ID"]=>
  string(1) "1"
  ["VALUE"]=>
  string(1) "1"
}
object(stdClass)#2 (2) {
  ["ID"]=>
  string(1) "1"
  ["VALUE"]=>
  string(1) "1"
}
object(stdClass)#1 (2) {
  ["ID"]=>
  string(1) "1"
  ["VALUE"]=>
  string(1) "1"
}
Done

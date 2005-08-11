/*
   +----------------------------------------------------------------------+
   | Zend Engine                                                          |
   +----------------------------------------------------------------------+
   | Copyright (c) 1998-2005 Zend Technologies Ltd. (http://www.zend.com) |
   +----------------------------------------------------------------------+
   | This source file is subject to version 2.00 of the Zend license,     |
   | that is bundled with this package in the file LICENSE, and is        | 
   | available through the world-wide-web at the following url:           |
   | http://www.zend.com/license/2_00.txt.                                |
   | If you did not receive a copy of the Zend license and are unable to  |
   | obtain it through the world-wide-web, please send a note to          |
   | license@zend.com so we can mail you a copy immediately.              |
   +----------------------------------------------------------------------+
   | Authors: Andi Gutmans <andi@zend.com>                                |
   |          Zeev Suraski <zeev@zend.com>                                |
   +----------------------------------------------------------------------+
*/

/* $Id$ */

#include <stdio.h>
#include "zend.h"
#include "zend_API.h"
#include "zend_globals.h"
#include "zend_constants.h"
#include "zend_list.h"


ZEND_API void _zval_dtor_func(zval *zvalue ZEND_FILE_LINE_DC)
{
	switch (zvalue->type & ~IS_CONSTANT_INDEX) {
		case IS_CONSTANT: {
			TSRMLS_FETCH();

			if (UG(unicode)) goto dtor_unicode;
		}
		case IS_STRING:
		case IS_BINARY:
			CHECK_ZVAL_STRING_REL(zvalue);
			STR_FREE_REL(zvalue->value.str.val);
			break;
		case IS_UNICODE:
dtor_unicode:
			CHECK_ZVAL_UNICODE_REL(zvalue);
			STR_FREE_REL(zvalue->value.ustr.val);
			break;
		case IS_ARRAY:
		case IS_CONSTANT_ARRAY: {
				TSRMLS_FETCH();

				if (zvalue->value.ht && (zvalue->value.ht != &EG(symbol_table))) {
					zend_hash_destroy(zvalue->value.ht);
					FREE_HASHTABLE(zvalue->value.ht);
				}
			}
			break;
		case IS_OBJECT:
			{
				TSRMLS_FETCH();

				Z_OBJ_HT_P(zvalue)->del_ref(zvalue TSRMLS_CC);
			}
			break;
		case IS_RESOURCE:
			{
				TSRMLS_FETCH();

				/* destroy resource */
				zend_list_delete(zvalue->value.lval);
			}
			break;
		case IS_LONG:
		case IS_DOUBLE:
		case IS_BOOL:
		case IS_NULL:
		default:
			return;
			break;
	}
}


ZEND_API void _zval_internal_dtor(zval *zvalue ZEND_FILE_LINE_DC)
{
	switch (zvalue->type & ~IS_CONSTANT_INDEX) {
		case IS_CONSTANT: {
			TSRMLS_FETCH();

			if (UG(unicode)) goto dtor_unicode;
		}
		case IS_STRING:
		case IS_BINARY:
			CHECK_ZVAL_STRING_REL(zvalue);
			free(zvalue->value.str.val);
			break;
		case IS_UNICODE:
dtor_unicode:
			CHECK_ZVAL_UNICODE_REL(zvalue);
			free(zvalue->value.ustr.val);
			break;
		case IS_ARRAY:
		case IS_CONSTANT_ARRAY:
		case IS_OBJECT:
		case IS_RESOURCE:
			zend_error(E_CORE_ERROR, "Internal zval's can't be arrays, objects or resources");
			break;
		case IS_LONG:
		case IS_DOUBLE:
		case IS_BOOL:
		case IS_NULL:
		default:
			break;
	}
}


ZEND_API void zval_add_ref(zval **p)
{
	(*p)->refcount++;
}


ZEND_API void _zval_copy_ctor_func(zval *zvalue ZEND_FILE_LINE_DC)
{
	switch (zvalue->type) {
		case IS_RESOURCE: {
				TSRMLS_FETCH();

				zend_list_addref(zvalue->value.lval);
			}
			break;
		case IS_BOOL:
		case IS_LONG:
		case IS_NULL:
			break;
		case IS_CONSTANT: {
			TSRMLS_FETCH();

			if (UG(unicode)) goto copy_unicode;
		}
		case IS_STRING:
		case IS_BINARY:
			CHECK_ZVAL_STRING_REL(zvalue);
			zvalue->value.str.val = (char *) estrndup_rel(zvalue->value.str.val, zvalue->value.str.len);
			break;
		case IS_UNICODE:
copy_unicode:
			CHECK_ZVAL_UNICODE_REL(zvalue);
			zvalue->value.ustr.val = eustrndup_rel(zvalue->value.ustr.val, zvalue->value.ustr.len);
			break;
		case IS_ARRAY:
		case IS_CONSTANT_ARRAY: {
				zval *tmp;
				HashTable *original_ht = zvalue->value.ht;
				HashTable *tmp_ht = NULL;
				TSRMLS_FETCH();

				if (zvalue->value.ht == &EG(symbol_table)) {
					return; /* do nothing */
				}
				ALLOC_HASHTABLE_REL(tmp_ht);
				zend_u_hash_init(tmp_ht, 0, NULL, ZVAL_PTR_DTOR, 0, original_ht->unicode);
				zend_hash_copy(tmp_ht, original_ht, (copy_ctor_func_t) zval_add_ref, (void *) &tmp, sizeof(zval *));
				zvalue->value.ht = tmp_ht;
			}
			break;
		case IS_OBJECT:
			{
				TSRMLS_FETCH();
				Z_OBJ_HT_P(zvalue)->add_ref(zvalue TSRMLS_CC);
			}
			break;
	}
}

ZEND_API int zend_print_variable(zval *var) 
{
	return zend_print_zval(var, 0);
}


#if ZEND_DEBUG
ZEND_API void _zval_copy_ctor_wrapper(zval *zvalue)
{
	zval_copy_ctor(zvalue);
}


ZEND_API void _zval_dtor_wrapper(zval *zvalue)
{
	zval_dtor(zvalue);
}


ZEND_API void _zval_internal_dtor_wrapper(zval *zvalue)
{
	zval_internal_dtor(zvalue);
}


ZEND_API void _zval_ptr_dtor_wrapper(zval **zval_ptr)
{
	zval_ptr_dtor(zval_ptr);
}


ZEND_API void _zval_internal_ptr_dtor_wrapper(zval **zval_ptr)
{
	zval_internal_ptr_dtor(zval_ptr);
}
#endif

/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * indent-tabs-mode: t
 * End:
 */

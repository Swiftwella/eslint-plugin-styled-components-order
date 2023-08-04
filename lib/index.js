/**
 * @fileoverview eslint plugin to sort css rules in styled components
 * @author swiftwella
 */
"use strict";

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

// import all rules in lib/rules
const path = require('path');
const importModules = require('import-modules');

module.exports = {
	rules: importModules(path.resolve(__dirname, 'rules'), { camelize: false })
}

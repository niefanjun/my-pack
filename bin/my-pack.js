#! /usr/bin/env node
const path = require('path');

const config = require(path.resolve('webpack.config.js'));

const Compiler = require('../lib/Compiler.js');

const compiler = new Compiler(config);

// 运行

compiler.run();

// console.log(__dirname,'name');
// console.log(process.cwd(),'cwd');
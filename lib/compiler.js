const path = require('path');
const fs = require('fs');
// babylon 吧源码转为为AST
let babylon = require('babylon');
// @babel/traverse 遍历节点
let traverse = require('@babel/traverse').default;
// @babel/types 替换节点
let t = require('@babel/types');
// @babel/generator 结果生成
let generator = require('@babel/generator').default;
// ejs模板
let ejs = require('ejs');


class Compiler {
    constructor(config) {
        // 配置文件
        this.config = config;
        // 保存入口文件路径
        this.entryId; // 入口文件
        // 保存所有模块依赖
        this.modules = {};
        this.entry = config.entry;
        // 工作路径
        this.root = process.cwd();
    }
    getSource(modulePath) {
        let source = fs.readFileSync(modulePath, 'utf-8');
        return source;
    }
    buildModule(modulePath, ifEntry) {
        console.log(modulePath,'path');
        // 拿到模块内容
        let source = this.getSource(modulePath);
        // 模块id
        let moduleName = `./${path.relative(this.root, modulePath).split(path.sep).join('/')}`;

        if (ifEntry) {
            this.entryId = moduleName;
        }

        // 解析，改写源码，返回依赖列表
        let {sourceCode, dependencies} = this.parse(source, path.dirname(moduleName));
        this.modules[moduleName] = sourceCode;
        // 对依赖项也执行同样的操作
        dependencies.forEach(dep => {
            // console.log(path.resolve(this.root, dep),dep,'dep')
            this.buildModule(path.resolve(this.root, dep).split(path.sep).join('/'), false);
        })
    }
    parse(source, parentPath) {
        // AST语法树解析
        //console.log(source, parentPath)
        let ast = babylon.parse(source);
        let dependencies = [];
        traverse(ast,{
            // 调用表达式
            CallExpression(p) {
                // 得到对应的节点
                let node = p.node;
                if (node.callee.name === 'require') {
                    node.callee.name = '__webpack_require__';
                    // 取到模块的引用名字
                    let moduleName = node.arguments[0].value;
                    // 拼接
                    moduleName = moduleName + (path.extname(moduleName)?'':'.js');
                    moduleName = './' + path.join(parentPath, moduleName).split(path.sep).join('/');
                    // 加入依赖
                    dependencies.push(moduleName);
                    node.arguments = [t.stringLiteral(moduleName)];
                }
            }
        })
        // 将ast树转回源码
        let sourceCode = generator(ast).code;
        return {
            sourceCode,
            dependencies
        }
    }
    emitFile() {
        // 抛出文件
        // 用得到的modules列表来打包
        console.log(this.modules,this.entryId);
        // 使用模板进行渲染

        // 输出路径
        let main = path.join(this.config.output.path, this.config.output.filename);
        let templateStr = this.getSource(path.join(__dirname, 'main.ejs'));
        let code = ejs.render(templateStr, {
            entryId: this.entryId,
            modules: this.modules
        });
        this.assets = {};
        this.assets[main] = code;

        // 如果没有对应文件夹，需要创建
        let parentDir = path.dirname(main);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir);
        }
        fs.writeFileSync(main, this.assets[main]);
    }
    run (){
        // 执行
        this.buildModule(path.resolve(this.root, this.entry).split(path.sep).join('/'), true /* 是主模块 */);
        // 抛出打包后文件
        this.emitFile();
    }
}
module.exports = Compiler;